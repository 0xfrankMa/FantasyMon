"""
E2E verification of EXP + level-up feature in FantasyMon.

Tests:
  A. Boss battle victory → level-up banners appear on the level-5 side pet
  B. Normal battle victory → no level-up banner (50 EXP < 100 threshold at Lv5)
  C. EXP/level persists across page reload (static localStorage check)
  D. Level-up after boss battle persists across page reload (dynamic)
"""

import json
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"
SCREENSHOTS = []


def log(msg):
    print(f"[TEST] {msg}")


def screenshot(page, path, label=""):
    page.screenshot(path=path, full_page=True)
    SCREENSHOTS.append(path)
    if label:
        log(f"Screenshot: {label} -> {path}")


# ---------------------------------------------------------------------------
# Save-state helpers
# ---------------------------------------------------------------------------

def make_skill_slot(skill_id, name, skill_type, power, accuracy, category, cooldown, effect=None):
    skill = {
        "id": skill_id,
        "name": name,
        "type": skill_type,
        "power": power,
        "accuracy": accuracy,
        "category": category,
        "cooldown": cooldown,
    }
    if effect:
        skill["effect"] = effect
    return {"skill": skill, "cooldownRemaining": 0}


def make_strong_carry(pet_id, species_id="embercub"):
    """
    Level-100 pet with max EVs/IVs and 4 powerful zero-cooldown skills.
    Using cooldown=0 for all skills ensures the carry can attack every single turn
    without cooldown gaps, guaranteeing it defeats any level-10 boss enemy.

    calcMaxHp(45 base_hp, 31 iv, 252 ev, 100):
      floor(((90+31+63)*100/100)+100+10) = floor(184+110) = 294
    We set hp to 294 to match real formula; high spAtk deals thousands of damage per hit.
    """
    return {
        "id": pet_id,
        "speciesId": species_id,
        "level": 100,
        "exp": 0,
        "nature": {"id": "modest", "boostedStat": "spAtk", "reducedStat": "atk"},
        "ivs":  {"hp": 31, "atk": 31, "def": 31, "spAtk": 31, "spDef": 31, "speed": 31},
        "evs":  {"hp": 252, "atk": 252, "def": 252, "spAtk": 252, "spDef": 252, "speed": 252},
        "skills": [
            # cooldown=0 means skill is always ready — no turns wasted waiting
            make_skill_slot("solarbeam",   "Solar Beam",   "grass",    120, 100, "special",  0),
            make_skill_slot("flamethrower","Flamethrower", "fire",      90, 100, "special",  0),
            make_skill_slot("thunderbolt", "Thunderbolt",  "electric",  90, 100, "special",  0),
            make_skill_slot("ember",       "Ember",        "fire",      40, 100, "special",  0),
        ],
        "evolutionStage": 0,
        "currentHp": 294,
        "maxHp": 294,
        "statusEffects": [],
    }


def make_lv5_pet(pet_id, species_id="embercub", exp=0):
    """Level-5 pet at zero EXP — used as EXP recipient, never fights."""
    return {
        "id": pet_id,
        "speciesId": species_id,
        "level": 5,
        "exp": exp,
        "nature": {"id": "hardy", "boostedStat": "atk", "reducedStat": "atk"},
        "ivs":  {"hp": 15, "atk": 15, "def": 15, "spAtk": 15, "spDef": 15, "speed": 15},
        "evs":  {"hp": 0,  "atk": 0,  "def": 0,  "spAtk": 0,  "spDef": 0,  "speed": 0},
        "skills": [
            make_skill_slot("ember", "Ember", "fire", 40, 100, "special", 1),
        ],
        "evolutionStage": 0,
        "currentHp": 55,
        "maxHp": 55,
        "statusEffects": [],
    }


def make_save(roster_pets, active_team_ids, node_index, nodes=None):
    if nodes is None:
        nodes = [
            {"id": "n0", "type": "normal", "completed": node_index > 0},
            {"id": "n1", "type": "elite",  "completed": node_index > 1},
            {"id": "n2", "type": "shop",   "completed": node_index > 2},
            {"id": "n3", "type": "rest",   "completed": node_index > 3},
            {"id": "n4", "type": "normal", "completed": node_index > 4},
            {"id": "n5", "type": "elite",  "completed": node_index > 5},
            {"id": "n6", "type": "boss",   "completed": False},
        ]
    return {
        "roster": roster_pets,
        "activeTeam": active_team_ids,
        "runState": {
            "nodes": nodes,
            "currentNodeIndex": node_index,
            "activeBuffs": [],
            "inRunCurrency": 50,
        },
        "wallet": 0,
        "unlockedSpecies": ["embercub", "aquafin", "leafpup", "voltmouse"],
    }


def inject_save(page, save_dict):
    page.evaluate(
        "(save) => { localStorage.setItem('fantasymon_save', JSON.stringify(save)); }",
        save_dict,
    )


def navigate_to_battle(page, save_dict):
    """Inject save, reload, then click 'Continue Run' to enter the battle screen."""
    inject_save(page, save_dict)
    page.reload()
    page.wait_for_load_state("networkidle")
    page.wait_for_selector("text=Continue Run", timeout=8000)
    page.click("text=Continue Run")
    page.wait_for_load_state("networkidle")


def wait_for_battle_end(page, timeout_ms=60000):
    """Wait for Victory! or Defeated! overlay."""
    page.wait_for_selector("text=Victory!, text=Defeated!", timeout=timeout_ms)


def wait_for_victory(page, timeout_ms=60000):
    """Wait specifically for Victory! — raises if Defeated! or timeout."""
    page.wait_for_selector("text=Victory!", timeout=timeout_ms)


# ---------------------------------------------------------------------------
# Test A: Boss battle victory → level-up banners appear
# ---------------------------------------------------------------------------

def test_a_boss_levelup(page):
    log("=== Test A: Boss battle → level-up banners ===")
    log("Setup: strong level-30 carry + level-5 side pet, both in active team, boss node (7/7)")
    log("Expected: carry wins boss fight; level-5 pet gets 250 EXP (5 enemies × level-10 × 5)")
    log("         threshold Lv5→6 = 100, so level-up banner MUST appear")

    # IMPORTANT: playerTeam = roster.filter(id in activeTeam), so roster ORDER determines
    # playerTeam[0] which sets baseLevel for enemy scaling.
    # Put level-5 side pet FIRST in roster so enemies are at boss-level 10 (5+5), not 35.
    # The level-30 carry (second in roster) still wins easily against level-10 enemies.
    carry  = make_strong_carry("pet-a-carry", "embercub")
    side   = make_lv5_pet("pet-a-side", "aquafin", exp=0)
    save   = make_save([side, carry], ["pet-a-side", "pet-a-carry"], node_index=6)
    navigate_to_battle(page, save)
    screenshot(page, "/tmp/a_01_battle_start.png", "A: Battle started (boss node 7/7)")

    log("Waiting for boss battle to finish...")
    try:
        wait_for_victory(page, timeout_ms=90000)
        screenshot(page, "/tmp/a_02_victory.png", "A: Victory overlay")
    except Exception as e:
        screenshot(page, "/tmp/a_02_failed.png", "A: Battle did not end in Victory")
        log(f"ERROR: Victory overlay never appeared — {e}")
        # Check what actually appeared
        content = page.content()
        if "Defeated" in content:
            log("  (Battle ended in Defeated! — carry pet lost)")
        return False

    # Check for level-up banner
    content = page.content()
    has_levelup = "→ Lv." in content
    log(f"Level-up banner text '→ Lv.' present in DOM: {has_levelup}")

    banners = page.locator("text=→ Lv.").all()
    log(f"Banner elements found: {len(banners)}")
    for i, el in enumerate(banners):
        try:
            log(f"  Banner {i+1}: '{el.inner_text()}'")
        except Exception:
            pass

    screenshot(page, "/tmp/a_03_overlay_detail.png", "A: Victory overlay detail")

    # Also check the saved state
    saved_raw = page.evaluate("() => localStorage.getItem('fantasymon_save')")
    if saved_raw:
        saved = json.loads(saved_raw)
        for pet in saved.get("roster", []):
            if pet["id"] == "pet-a-side":
                log(f"  Side pet (aquafin) level in save: {pet['level']}, exp: {pet['exp']}")
            if pet["id"] == "pet-a-carry":
                log(f"  Carry pet (embercub) level in save: {pet['level']}, exp: {pet['exp']}")

    if has_levelup:
        log("PASS: Level-up banners appeared after boss battle")
        return True
    else:
        log("FAIL: No level-up banners found after boss battle")
        idx = content.find("Victory")
        if idx >= 0:
            log(f"Content near Victory: {content[max(0,idx-200):idx+800]}")
        return False


# ---------------------------------------------------------------------------
# Test B: Single normal battle victory → NO level-up banner
# ---------------------------------------------------------------------------

def test_b_normal_no_banner(page):
    log("=== Test B: Normal battle → no level-up banner ===")
    log("Setup: strong carry + level-5 side pet, normal node (1/7)")
    log("Expected: win battle; level-5 pet gets 50 EXP (2 enemies × level-5 × 5)")
    log("         threshold Lv5→6 = 100, so NO level-up banner")

    # Normal node: 2 level-5 enemies → 2*5*5=50 EXP; need 100 to level — no banner
    nodes = [
        {"id": "n0", "type": "normal", "completed": False},
        {"id": "n1", "type": "elite",  "completed": False},
        {"id": "n2", "type": "shop",   "completed": False},
        {"id": "n3", "type": "rest",   "completed": False},
        {"id": "n4", "type": "normal", "completed": False},
        {"id": "n5", "type": "elite",  "completed": False},
        {"id": "n6", "type": "boss",   "completed": False},
    ]
    # IMPORTANT: roster order determines playerTeam[0] which sets baseLevel.
    # Side pet (lv5) FIRST in roster → normal enemies at level 5 → 2×5×5=50 EXP < 100 threshold.
    carry = make_strong_carry("pet-b-carry", "embercub")
    side  = make_lv5_pet("pet-b-side", "aquafin", exp=0)
    save  = make_save([side, carry], ["pet-b-side", "pet-b-carry"], node_index=0, nodes=nodes)
    navigate_to_battle(page, save)
    screenshot(page, "/tmp/b_01_battle_start.png", "B: Normal battle start")

    log("Waiting for normal battle to finish...")
    try:
        wait_for_victory(page, timeout_ms=60000)
        screenshot(page, "/tmp/b_02_victory.png", "B: Victory overlay")
    except Exception as e:
        screenshot(page, "/tmp/b_02_failed.png", "B: Battle did not end in Victory")
        log(f"ERROR: {e}")
        return False

    content = page.content()
    has_levelup = "→ Lv." in content
    log(f"Level-up banner text '→ Lv.' present in DOM: {has_levelup}")

    saved_raw = page.evaluate("() => localStorage.getItem('fantasymon_save')")
    if saved_raw:
        saved = json.loads(saved_raw)
        for pet in saved.get("roster", []):
            if pet["id"] == "pet-b-side":
                log(f"  Side pet level: {pet['level']}, exp: {pet['exp']} (expected lv5, exp=50)")

    screenshot(page, "/tmp/b_03_overlay_detail.png", "B: Overlay detail")

    if not has_levelup:
        log("PASS: No level-up banner after single normal battle (correct — 50 EXP < 100 threshold)")
        return True
    else:
        log("FAIL: Unexpected level-up banner appeared after normal battle")
        return False


# ---------------------------------------------------------------------------
# Test C: EXP/level persistence across page reload (static injection)
# ---------------------------------------------------------------------------

def test_c_exp_persistence(page):
    log("=== Test C: EXP persistence across page reload (static) ===")
    log("Setup: inject a save with a pet at level=6, exp=50; reload; verify unchanged")

    roster_pet = {
        "id": "pet-c-1",
        "speciesId": "embercub",
        "level": 6,
        "exp": 50,
        "nature": {"id": "hardy", "boostedStat": "atk", "reducedStat": "atk"},
        "ivs":  {"hp": 15, "atk": 15, "def": 15, "spAtk": 15, "spDef": 15, "speed": 15},
        "evs":  {"hp": 0,  "atk": 0,  "def": 0,  "spAtk": 0,  "spDef": 0,  "speed": 0},
        "skills": [make_skill_slot("ember", "Ember", "fire", 40, 100, "special", 1)],
        "evolutionStage": 0,
        "currentHp": 60,
        "maxHp": 60,
        "statusEffects": [],
    }
    save = {
        "roster": [roster_pet],
        "activeTeam": ["pet-c-1"],
        "runState": None,
        "wallet": 100,
        "unlockedSpecies": ["embercub", "aquafin", "leafpup", "voltmouse"],
    }
    inject_save(page, save)
    page.reload()
    page.wait_for_load_state("networkidle")
    screenshot(page, "/tmp/c_01_home.png", "C: Home after inject + reload")

    saved_raw = page.evaluate("() => localStorage.getItem('fantasymon_save')")
    if not saved_raw:
        log("FAIL: No save found in localStorage after reload")
        return False

    saved = json.loads(saved_raw)
    pets = saved.get("roster", [])
    if not pets:
        log("FAIL: Empty roster after reload")
        return False

    pet = pets[0]
    level_ok = pet.get("level") == 6
    exp_ok   = pet.get("exp")   == 50
    log(f"  Level: {pet.get('level')} (expected 6)  → {'OK' if level_ok else 'FAIL'}")
    log(f"  EXP:   {pet.get('exp')}   (expected 50) → {'OK' if exp_ok   else 'FAIL'}")

    if level_ok and exp_ok:
        log("PASS: EXP and level persisted correctly across page reload")
        return True
    else:
        log("FAIL: EXP or level did not persist")
        return False


# ---------------------------------------------------------------------------
# Test D: Level-up after boss battle persists across page reload (dynamic)
# ---------------------------------------------------------------------------

def test_d_levelup_persists_after_reload(page):
    log("=== Test D: Boss battle level-up → persists after reload ===")
    log("Setup: same as Test A; after Victory, note the new level; reload; verify it matches")

    carry = make_strong_carry("pet-d-carry", "embercub")
    side  = make_lv5_pet("pet-d-side", "aquafin", exp=0)
    # Side pet FIRST in roster → baseLevel=5 → boss enemies at level 10
    save  = make_save([side, carry], ["pet-d-side", "pet-d-carry"], node_index=6)
    navigate_to_battle(page, save)
    screenshot(page, "/tmp/d_01_battle_start.png", "D: Boss battle start")

    log("Waiting for boss battle to finish...")
    try:
        wait_for_victory(page, timeout_ms=90000)
    except Exception as e:
        screenshot(page, "/tmp/d_02_failed.png", "D: Battle did not end in Victory")
        log(f"ERROR: {e}")
        return False

    screenshot(page, "/tmp/d_02_victory.png", "D: Victory + level-up")

    # Read level from localStorage immediately after battle
    saved_raw = page.evaluate("() => localStorage.getItem('fantasymon_save')")
    if not saved_raw:
        log("FAIL: No save after battle")
        return False

    saved_before = json.loads(saved_raw)
    side_before  = next((p for p in saved_before.get("roster", []) if p["id"] == "pet-d-side"), None)
    if not side_before:
        log("FAIL: Side pet not found in save")
        return False

    level_before = side_before["level"]
    exp_before   = side_before["exp"]
    log(f"  Side pet immediately after boss battle: level={level_before}, exp={exp_before}")

    if level_before <= 5:
        log("FAIL: Side pet did not level up after boss battle")
        return False

    # Reload and verify persistence
    page.reload()
    page.wait_for_load_state("networkidle")
    screenshot(page, "/tmp/d_03_after_reload.png", "D: Home after reload")

    saved_raw_after = page.evaluate("() => localStorage.getItem('fantasymon_save')")
    if not saved_raw_after:
        log("FAIL: No save found after reload")
        return False

    saved_after = json.loads(saved_raw_after)
    side_after  = next((p for p in saved_after.get("roster", []) if p["id"] == "pet-d-side"), None)
    if not side_after:
        log("FAIL: Side pet missing after reload")
        return False

    level_after = side_after["level"]
    exp_after   = side_after["exp"]
    log(f"  Side pet after reload: level={level_after}, exp={exp_after}")
    log(f"  Expected: level={level_before}, exp={exp_before}")

    level_ok = level_after == level_before
    exp_ok   = exp_after   == exp_before
    log(f"  Level persisted: {'OK' if level_ok else 'FAIL'}")
    log(f"  EXP persisted:   {'OK' if exp_ok   else 'FAIL'}")

    if level_ok and exp_ok:
        log("PASS: Level and EXP persist correctly after boss battle level-up + page reload")
        return True
    else:
        log("FAIL: Level/EXP did not persist after reload")
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    results = {}

    with sync_playwright() as p:
        browser  = p.chromium.launch(headless=True)
        context  = browser.new_context(viewport={"width": 1280, "height": 800})
        page     = context.new_page()

        console_msgs = []
        page.on("console", lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}"))

        log(f"Navigating to {BASE_URL}")
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle")
        screenshot(page, "/tmp/00_home.png", "Initial home screen")

        # Run tests, clearing save between each
        page.evaluate("() => localStorage.removeItem('fantasymon_save')")
        results["A_boss_levelup_banners"]        = test_a_boss_levelup(page)
        page.evaluate("() => localStorage.removeItem('fantasymon_save')")
        results["B_normal_no_banner"]             = test_b_normal_no_banner(page)
        page.evaluate("() => localStorage.removeItem('fantasymon_save')")
        results["C_exp_persistence_static"]       = test_c_exp_persistence(page)
        page.evaluate("() => localStorage.removeItem('fantasymon_save')")
        results["D_levelup_persists_after_reload"] = test_d_levelup_persists_after_reload(page)

        # Show any console errors
        errors = [m for m in console_msgs if "[error]" in m.lower()]
        if errors:
            log(f"Console errors during tests ({len(errors)}):")
            for e in errors[:10]:
                log(f"  {e}")

        browser.close()

    print()
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    all_pass = True
    for name, result in results.items():
        status = "PASS" if result else "FAIL"
        print(f"  {status}  {name}")
        if not result:
            all_pass = False

    print()
    print("Overall:", "ALL PASS" if all_pass else "SOME TESTS FAILED")
    print()
    print("Screenshots saved:")
    for s in SCREENSHOTS:
        print(f"  {s}")

    return 0 if all_pass else 1


if __name__ == "__main__":
    import sys
    sys.exit(main())

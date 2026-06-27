"""Generate lightweight runtime images while keeping source PNG files untouched."""

from pathlib import Path
import re

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PYKUR = ROOT / "familiers" / "pykur"
DATA = PYKUR / "data" / "familiars.js"


def save_webp(source: Path, target: Path, max_size=None, quality=82):
    if not source.exists():
        raise FileNotFoundError(source)
    if target.exists() and target.stat().st_mtime >= source.stat().st_mtime:
        return False
    with Image.open(source) as image:
        image.load()
        if max_size:
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, "WEBP", quality=quality, method=6)
    return True


def resolve_asset(asset: str) -> Path:
    return (PYKUR / asset).resolve()


def catalog_assets():
    source = DATA.read_text(encoding="utf-8")
    pattern = re.compile(
        r'\bid:"(?P<id>[^"]+)"(?P<body>[\s\S]*?)\n\s*dungeons:\[',
        re.MULTILINE,
    )
    output = PYKUR / "assets" / "optimized" / "catalog"
    count = 0
    for match in pattern.finditer(source):
        familiar_id = match.group("id")
        body = match.group("body")
        logo = re.search(r'\blogo:"([^"]+)"', body)
        icon = re.search(r'\bicon:"([^"]+)"', body)
        if not logo or not icon:
            continue
        logo_source = resolve_asset(logo.group(1))
        icon_source = resolve_asset(icon.group(1))
        if not logo_source.exists() or not icon_source.exists():
            continue
        save_webp(logo_source, output / f"{familiar_id}.webp", (240, 240), 84)
        save_webp(icon_source, output / f"{familiar_id}-icon.webp", (72, 72), 86)
        count += 1
    return count


def backgrounds():
    count = 0
    for source in (ROOT / "familiers").rglob("fond.png"):
        save_webp(source, source.with_suffix(".webp"), None, 80)
        count += 1
    return count


def interface_assets():
    assets = {
        "aide": PYKUR / "assets" / "bouton" / "aide.png",
        "son": PYKUR / "assets" / "bouton" / "son.png",
        "sonoff": PYKUR / "assets" / "bouton" / "sonoff.png",
        "succes": PYKUR / "assets" / "bouton" / "succes.png",
        "galerie": PYKUR / "assets" / "bouton" / "galerie.png",
        "option": PYKUR / "assets" / "bouton" / "option.png",
        "oeuf": PYKUR / "assets" / "images" / "oeuf.png",
    }
    output = PYKUR / "assets" / "optimized" / "ui"
    for name, source in assets.items():
        save_webp(source, output / f"{name}.webp", (96, 96), 88)
    with Image.open(PYKUR / "assets" / "images" / "logo.png") as icon:
        icon.thumbnail((64, 64), Image.Resampling.LANCZOS)
        icon.save(output / "favicon.png", "PNG", optimize=True)
    return len(assets) + 1


def dungeon_assets():
    source = DATA.read_text(encoding="utf-8")
    assets = set(re.findall(r'\basset:"([^"]+\.png)"', source))
    count = 0
    for asset in assets:
        image = resolve_asset(asset)
        if not image.exists():
            continue
        save_webp(image, image.with_suffix(".webp"), (640, 640), 84)
        count += 1
    return count


if __name__ == "__main__":
    print(f"Catalog thumbnails: {catalog_assets()}")
    print(f"Backgrounds: {backgrounds()}")
    print(f"Interface assets: {interface_assets()}")
    print(f"Dungeon assets: {dungeon_assets()}")

import os
import re
import time
from PIL import Image, ImageChops, ImageStat
from concurrent.futures import ProcessPoolExecutor

def natural_keys(text):
    return [int(c) if c.isdigit() else c.lower() for c in re.split(r'(\d+)', text)]

def img_diff(p1, p2):
    im1 = Image.open(p1).convert('RGB')
    im2 = Image.open(p2).convert('RGB')
    diff_img = ImageChops.difference(im1, im2)
    stat = ImageStat.Stat(diff_img)
    return sum(stat.mean) / 3.0

def process_one_frame(task):
    src_path, dest_desktop, dest_mobile = task
    try:
        with Image.open(src_path) as im:
            im = im.convert('RGB')
            # 1600x900 desktop (quality 78)
            im_desk = im.resize((1600, 900), Image.Resampling.BICUBIC)
            im_desk.save(dest_desktop, 'WEBP', quality=78, method=4)
            
            # 960x540 mobile (quality 72)
            im_mob = im.resize((960, 540), Image.Resampling.BICUBIC)
            im_mob.save(dest_mobile, 'WEBP', quality=72, method=4)
        return True
    except Exception as e:
        print(f"Error processing {src_path}: {e}")
        return False

def get_folder_info(folder):
    total_bytes = 0
    count = 0
    for root, _, files in os.walk(folder):
        for f in files:
            fp = os.path.join(root, f)
            total_bytes += os.path.getsize(fp)
            count += 1
    return count, total_bytes

def main():
    start_time = time.time()
    
    # 1. Setup directories
    dirs = [
        'assets/frames/hero',
        'assets/frames/hero-mobile',
        'assets/frames/dismantle',
        'assets/frames/dismantle-mobile',
        'assets/cars'
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

    # 2. Collect hero clip frames
    clip1_files = sorted([os.path.join('clip1.zip', f) for f in os.listdir('clip1.zip') if f.lower().endswith(('.png', '.jpg', '.jpeg'))], key=natural_keys)
    clip2_files = sorted([os.path.join('clip2.zip', f) for f in os.listdir('clip2.zip') if f.lower().endswith(('.png', '.jpg', '.jpeg'))], key=natural_keys)
    clip3_files = sorted([os.path.join('clip3.zip', f) for f in os.listdir('clip3.zip') if f.lower().endswith(('.png', '.jpg', '.jpeg'))], key=natural_keys)

    print(f"Clip 1 frames: {len(clip1_files)}")
    print(f"Clip 2 frames: {len(clip2_files)}")
    print(f"Clip 3 frames: {len(clip3_files)}")

    # Check join boundaries for duplicates
    if clip1_files and clip2_files:
        d12 = img_diff(clip1_files[-1], clip2_files[0])
        print(f"Diff between clip 1 last and clip 2 first: {d12:.2f}")
        if d12 < 1.0:
            print("Skipping clip2 first frame (nearly identical duplicate)")
            clip2_files = clip2_files[1:]

    if clip2_files and clip3_files:
        d23 = img_diff(clip2_files[-1], clip3_files[0])
        print(f"Diff between clip 2 last and clip 3 first: {d23:.2f}")
        if d23 < 1.0:
            print("Skipping clip3 first frame (nearly identical duplicate)")
            clip3_files = clip3_files[1:]

    hero_sources = clip1_files + clip2_files + clip3_files
    print(f"Total hero source frames to convert: {len(hero_sources)}")

    # Dismantle sources
    dismantle_sources = sorted([os.path.join('clip4.zip', f) for f in os.listdir('clip4.zip') if f.lower().endswith(('.png', '.jpg', '.jpeg'))], key=natural_keys)
    print(f"Total dismantle source frames to convert: {len(dismantle_sources)}")

    # Prepare tasks
    tasks = []
    for idx, src in enumerate(hero_sources, start=1):
        num_str = f"{idx:04d}"
        dest_desk = os.path.join('assets/frames/hero', f"frame_{num_str}.webp")
        dest_mob = os.path.join('assets/frames/hero-mobile', f"frame_{num_str}.webp")
        tasks.append((src, dest_desk, dest_mob))

    for idx, src in enumerate(dismantle_sources, start=1):
        num_str = f"{idx:04d}"
        dest_desk = os.path.join('assets/frames/dismantle', f"frame_{num_str}.webp")
        dest_mob = os.path.join('assets/frames/dismantle-mobile', f"frame_{num_str}.webp")
        tasks.append((src, dest_desk, dest_mob))

    print(f"Executing {len(tasks)} conversion tasks using ProcessPoolExecutor...")
    workers = max(1, os.cpu_count() - 1)
    with ProcessPoolExecutor(max_workers=workers) as executor:
        results = list(executor.map(process_one_frame, tasks))

    print(f"Completed {sum(1 for r in results if r)} of {len(tasks)} conversions in {time.time() - start_time:.1f}s")

    # Folder sizes
    print("\n--- OUTPUT FOLDER SUMMARY ---")
    for d in ['assets/frames/hero', 'assets/frames/hero-mobile', 'assets/frames/dismantle', 'assets/frames/dismantle-mobile']:
        cnt, sz = get_folder_info(d)
        print(f"{d}: {cnt} frames, {sz / (1024*1024):.2f} MB ({sz:,} bytes)")

if __name__ == '__main__':
    main()


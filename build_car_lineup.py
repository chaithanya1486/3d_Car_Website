import os
import colorsys
from PIL import Image

def build_lineup():
    os.makedirs('assets/cars', exist_ok=True)
    
    # Save first assemble frame as fallback placeholder
    first_dismantle = Image.open('assets/frames/dismantle/frame_0001.webp')
    first_dismantle.save('assets/cars/placeholder.webp', 'WEBP', quality=85)
    
    base_src = Image.open('80aa5c96-6861-41c4-aed6-3f6430a9799f.png').convert('RGB')
    car_crop = base_src.crop((8, 280, 878, 565))
    cw_orig, ch_orig = car_crop.size
    
    target_w = int(1600 * 0.70) # 1120px
    scale = target_w / cw_orig
    target_h = int(ch_orig * scale)
    
    car_base_scaled = car_crop.resize((target_w, target_h), Image.Resampling.LANCZOS)
    cw, ch = car_base_scaled.size
    
    models = [
        ('gt-e', 'matte graphite grand tourer', 'graphite'),
        ('s', 'satin bone white sedan', 'bone_white'),
        ('x', 'midnight blue coupe-SUV', 'midnight_blue'),
        ('r', 'satin black track coupe with red accents', 'track_r'),
        ('one', 'liquid silver concept hypercar', 'liquid_silver')
    ]
    
    for name, desc, model_type in models:
        car_img = car_base_scaled.copy()
        pixels = car_img.load()
        
        for y in range(ch):
            for x in range(cw):
                r, g, b = pixels[x, y]
                rn, gn, bn = r / 255.0, g / 255.0, b / 255.0
                h, s, v = colorsys.rgb_to_hsv(rn, gn, bn)
                
                # Protect light signature (xenon front bar)
                is_light_bar = (v > 0.60 and s < 0.30 and abs(r - b) < 35 and x > cw * 0.75)
                # Protect taillight (rear red bar)
                is_taillight = ((h < 0.04 or h > 0.95) and s > 0.55 and v > 0.30 and x < cw * 0.18)
                
                if is_light_bar or is_taillight:
                    continue
                
                # Identify orange paint
                is_orange = (0.015 <= h <= 0.14 and s > 0.18 and v > 0.10)
                
                if is_orange:
                    if model_type == 'graphite': # matte graphite (dark gunmetal)
                        new_h = 0.60
                        new_s = 0.02
                        new_v = min(0.65, v * 0.35 + 0.05)
                        nr, ng, nb = colorsys.hsv_to_rgb(new_h, new_s, new_v)
                        pixels[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255))
                    elif model_type == 'bone_white': # satin bone white
                        new_h = 0.11
                        new_s = 0.04
                        new_v = min(0.96, v * 0.85 + 0.16)
                        nr, ng, nb = colorsys.hsv_to_rgb(new_h, new_s, new_v)
                        pixels[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255))
                    elif model_type == 'midnight_blue': # midnight blue
                        new_h = 0.61
                        new_s = 0.70
                        new_v = min(0.70, v * 0.45 + 0.04)
                        nr, ng, nb = colorsys.hsv_to_rgb(new_h, new_s, new_v)
                        pixels[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255))
                    elif model_type == 'track_r': # satin black with subtle red accents
                        # Subtle 2px red pinstripe at bottom side skirt
                        if y >= int(ch * 0.90) and y <= int(ch * 0.92) and x > cw * 0.25 and x < cw * 0.75:
                            pixels[x, y] = (225, 37, 27)
                        else:
                            new_v = min(0.50, v * 0.22 + 0.03)
                            nr, ng, nb = colorsys.hsv_to_rgb(0.0, 0.0, new_v)
                            pixels[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255))
                    elif model_type == 'liquid_silver': # liquid silver
                        new_h = 0.58
                        new_s = 0.04
                        new_v = min(0.95, pow(v, 0.75) * 0.88 + 0.10)
                        nr, ng, nb = colorsys.hsv_to_rgb(new_h, new_s, new_v)
                        pixels[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255))
                else:
                    # Clean background blend into #07080A (7, 8, 10)
                    intensity = (r + g + b) / 3.0
                    if intensity < 38 and s < 0.20:
                        fade = min(1.0, max(0.0, (intensity - 8) / 30.0))
                        bg_r, bg_g, bg_b = 7, 8, 10
                        nr = int(bg_r + (r - bg_r) * fade * 0.3)
                        ng = int(bg_g + (g - bg_g) * fade * 0.3)
                        nb = int(bg_b + (b - bg_b) * fade * 0.3)
                        pixels[x, y] = (nr, ng, nb)
        
        # 1600x900 flat #07080A
        canvas = Image.new('RGB', (1600, 900), (7, 8, 10))
        pos_x = (1600 - target_w) // 2
        wheel_contact_y = int(900 * 0.72) # 648px
        pos_y = wheel_contact_y - target_h + int(8 * scale)
        
        canvas.paste(car_img, (pos_x, pos_y))
        
        out_path = f"assets/cars/{name}.webp"
        canvas.save(out_path, 'WEBP', quality=85)
        print(f"Generated {out_path} ({desc}) - {os.path.getsize(out_path):,} bytes")

if __name__ == '__main__':
    build_lineup()

import os
from PIL import Image

def process_lineup():
    os.makedirs('assets/cars', exist_ok=True)
    
    # Base car from 80aa
    im = Image.open('80aa5c96-6861-41c4-aed6-3f6430a9799f.png').convert('RGB')
    car_crop = im.crop((8, 280, 878, 565))
    w, h = car_crop.size
    
    target_w = int(1600 * 0.70) # 1120px
    scale = target_w / w
    target_h = int(h * scale)
    
    car_scaled = car_crop.resize((target_w, target_h), Image.Resampling.LANCZOS)
    cw, ch = car_scaled.size
    
    # 5 variants definitions
    # Mode identifies how body paint is transformed:
    variants = [
        ('gt-e', 'matte graphite'),
        ('s', 'satin bone white'),
        ('x', 'midnight blue'),
        ('r', 'satin black with red accents'),
        ('one', 'liquid silver')
    ]
    
    for name, desc in variants:
        canvas = Image.new('RGB', (1600, 900), (7, 8, 10))
        car_img = car_scaled.copy()
        pixels = car_img.load()
        
        for y in range(ch):
            for x in range(cw):
                r, g, b = pixels[x, y]
                
                # Background blending: studio floor/wall pixels are dark near-grey
                # Car tires/shadows are at the bottom, body has color
                brightness = (r + g + b) / 3.0
                
                # Check if it's the orange body paint:
                # Orange has R > 80, G is 30-160, B < 70, and R - B > 35
                is_body_orange = (r > 70 and g > 25 and b < 80 and (r - b) > 35 and (r - g) > 5)
                
                # Headlight pixels: very bright cool white
                is_headlight = (r > 160 and g > 160 and b > 160 and abs(r - b) < 40)
                # Taillight pixels: pure intense red
                is_taillight = (r > 150 and g < 60 and b < 60)
                
                if is_headlight or is_taillight:
                    # Keep headlights and taillights pristine!
                    continue
                
                if is_body_orange:
                    lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
                    
                    if name == 'gt-e': # matte graphite
                        val = int(lum * 140) + 20
                        pixels[x, y] = (int(val * 0.95), int(val * 0.97), int(val * 1.05))
                    elif name == 's': # satin bone white
                        # bone is #EDEAE4 -> (237, 234, 228)
                        val = int(lum * 160) + 85
                        val = min(245, max(0, val))
                        pixels[x, y] = (int(val * 0.98), int(val * 0.96), int(val * 0.94))
                    elif name == 'x': # midnight blue
                        val = int(lum * 160) + 15
                        pixels[x, y] = (int(val * 0.35), int(val * 0.55), int(val * 0.95) + 15)
                    elif name == 'r': # satin black with thin red accents
                        # check if edge or lower skirt for red accent
                        if y > ch * 0.88 or (x < cw * 0.25 and y > ch * 0.7):
                            # Red racing accent
                            pixels[x, y] = (225, 37, 27)
                        else:
                            val = int(lum * 70) + 16
                            pixels[x, y] = (val, val, int(val * 1.05))
                    elif name == 'one': # liquid silver
                        # High reflection metallic chrome
                        val = int(pow(lum, 0.85) * 200) + 40
                        val = min(250, max(0, val))
                        pixels[x, y] = (int(val * 0.96), int(val * 0.98), int(val * 1.02))
                else:
                    # Background edge smoothing into #07080A
                    # If pixel is dark and low saturation (studio backdrop)
                    if brightness < 45 and max(r, g, b) - min(r, g, b) < 18:
                        # feather to background (7, 8, 10)
                        blend_factor = min(1.0, max(0.0, (brightness - 10) / 35.0))
                        bg_r, bg_g, bg_b = 7, 8, 10
                        nr = int(bg_r + (r - bg_r) * blend_factor * 0.4)
                        ng = int(bg_g + (g - bg_g) * blend_factor * 0.4)
                        nb = int(bg_b + (b - bg_b) * blend_factor * 0.4)
                        pixels[x, y] = (nr, ng, nb)
        
        pos_x = (1600 - target_w) // 2
        wheel_contact_y = int(900 * 0.72) # 648px
        pos_y = wheel_contact_y - target_h + int(8 * scale)
        
        canvas.paste(car_img, (pos_x, pos_y))
        
        out_path = f"assets/cars/{name}.webp"
        canvas.save(out_path, 'WEBP', quality=85)
        print(f"Saved {out_path} ({desc}) - {os.path.getsize(out_path):,} bytes")

if __name__ == '__main__':
    process_lineup()


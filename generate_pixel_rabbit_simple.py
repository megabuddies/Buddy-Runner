#!/usr/bin/env python3
import os

def create_svg_pixel_sprite(width, height, pixel_data, scale=6):
    """Create SVG sprite from pixel data"""
    svg_lines = [
        f'<svg width="{width * scale}" height="{height * scale}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width * scale} {height * scale}">',
        f'<rect width="100%" height="100%" fill="transparent"/>'
    ]
    
    # Colors
    colors = {
        'WHITE': '#F5F2EB',
        'BLACK': '#000000',
        'ORANGE': '#F85A4A', 
        'PINK': '#FFB8B8',
        'GRAY': '#9BB8C9',
        'GREEN': '#4A9E4A'
    }
    
    for y in range(height):
        for x in range(width):
            if y < len(pixel_data) and x < len(pixel_data[y]):
                color_name = pixel_data[y][x]
                if color_name != 'TRANSPARENT' and color_name in colors:
                    color = colors[color_name]
                    svg_lines.append(
                        f'<rect x="{x * scale}" y="{y * scale}" width="{scale}" height="{scale}" fill="{color}"/>'
                    )
    
    svg_lines.append('</svg>')
    return '\n'.join(svg_lines)

def create_rabbit_standing_sprite(eyes_closed=False):
    """Create standing rabbit sprite pixel data"""
    width, height = 44, 47
    
    # Initialize with transparent background
    sprite_data = [['TRANSPARENT' for _ in range(width)] for _ in range(height)]
    
    # Head outline
    for x in range(15, 30):
        sprite_data[8][x] = 'BLACK'   # Top of head
        sprite_data[32][x] = 'BLACK'  # Bottom of head
    
    for y in range(9, 32):
        sprite_data[y][14] = 'BLACK'  # Left side
        sprite_data[y][30] = 'BLACK'  # Right side
    
    # Left ear
    for y in range(2, 8):
        sprite_data[y][17] = 'BLACK'
        sprite_data[y][21] = 'BLACK'
    for x in range(18, 21):
        sprite_data[1][x] = 'BLACK'
        sprite_data[8][x] = 'BLACK'
    
    # Right ear
    for y in range(2, 8):
        sprite_data[y][23] = 'BLACK'
        sprite_data[y][27] = 'BLACK'
    for x in range(24, 27):
        sprite_data[1][x] = 'BLACK'
        sprite_data[8][x] = 'BLACK'
    
    # Body outline
    for x in range(10, 35):
        sprite_data[33][x] = 'BLACK'  # Top of body
        sprite_data[46][x] = 'BLACK'  # Bottom of body
    
    for y in range(34, 46):
        sprite_data[y][9] = 'BLACK'   # Left side
        sprite_data[y][35] = 'BLACK'  # Right side
    
    # Arms
    for y in range(36, 41):
        sprite_data[y][6] = 'BLACK'
        sprite_data[y][11] = 'BLACK'
        sprite_data[y][33] = 'BLACK'
        sprite_data[y][38] = 'BLACK'
    
    for x in range(7, 11):
        sprite_data[35][x] = 'BLACK'
        sprite_data[41][x] = 'BLACK'
    
    for x in range(34, 38):
        sprite_data[35][x] = 'BLACK'
        sprite_data[41][x] = 'BLACK'
    
    # Fill head
    for y in range(9, 32):
        for x in range(15, 30):
            sprite_data[y][x] = 'WHITE'
    
    # Fill ears
    for y in range(2, 8):
        for x in range(18, 21):
            sprite_data[y][x] = 'WHITE'
        for x in range(24, 27):
            sprite_data[y][x] = 'WHITE'
    
    # Ear insides
    for y in range(3, 7):
        sprite_data[y][19] = 'GRAY'
        sprite_data[y][25] = 'GRAY'
    
    # Fill body
    for y in range(34, 46):
        for x in range(10, 35):
            sprite_data[y][x] = 'WHITE'
    
    # Fill arms
    for y in range(36, 41):
        for x in range(7, 11):
            sprite_data[y][x] = 'WHITE'
        for x in range(34, 38):
            sprite_data[y][x] = 'WHITE'
    
    # Eyes
    if eyes_closed:
        # Closed eyes (horizontal lines)
        for x in range(18, 21):
            sprite_data[16][x] = 'BLACK'
        for x in range(24, 27):
            sprite_data[16][x] = 'BLACK'
    else:
        # Open eyes
        sprite_data[15][19] = 'BLACK'
        sprite_data[16][19] = 'BLACK'
        sprite_data[15][25] = 'BLACK'
        sprite_data[16][25] = 'BLACK'
        # Eye highlights
        sprite_data[15][19] = 'WHITE'
        sprite_data[15][25] = 'WHITE'
    
    # Nose
    sprite_data[20][22] = 'ORANGE'
    
    # Cheeks
    sprite_data[22][16] = 'PINK'
    sprite_data[22][28] = 'PINK'
    
    # Mouth
    sprite_data[24][21] = 'BLACK'
    sprite_data[25][22] = 'BLACK'
    sprite_data[24][23] = 'BLACK'
    
    return sprite_data

def create_rabbit_running_sprite(frame=1):
    """Create running rabbit sprite with animation frame"""
    width, height = 44, 47
    
    # Initialize with transparent background
    sprite_data = [['TRANSPARENT' for _ in range(width)] for _ in range(height)]
    
    # Slight offset for animation
    tilt = 1 if frame == 2 else 0
    
    # Head outline (slightly tilted)
    for x in range(15, 30):
        sprite_data[8 + tilt][x] = 'BLACK'
        sprite_data[32 + tilt][x] = 'BLACK'
    
    for y in range(9, 32):
        sprite_data[y + tilt][14] = 'BLACK'
        sprite_data[y + tilt][30] = 'BLACK'
    
    # Ears (different positions for animation)
    if frame == 1:
        # Frame 1: ears more upright
        for y in range(2, 8):
            sprite_data[y][17] = 'BLACK'
            sprite_data[y][21] = 'BLACK'
            sprite_data[y][23] = 'BLACK'
            sprite_data[y][27] = 'BLACK'
        
        for x in range(18, 21):
            sprite_data[1][x] = 'BLACK'
            sprite_data[8][x] = 'BLACK'
        
        for x in range(24, 27):
            sprite_data[1][x] = 'BLACK'
            sprite_data[8][x] = 'BLACK'
        
        # Fill ears
        for y in range(2, 8):
            for x in range(18, 21):
                sprite_data[y][x] = 'WHITE'
            for x in range(24, 27):
                sprite_data[y][x] = 'WHITE'
        
        sprite_data[4][19] = 'GRAY'
        sprite_data[4][25] = 'GRAY'
    else:
        # Frame 2: ears slightly back
        for y in range(3, 9):
            sprite_data[y][16] = 'BLACK'
            sprite_data[y][20] = 'BLACK'
            sprite_data[y][24] = 'BLACK'
            sprite_data[y][28] = 'BLACK'
        
        for x in range(17, 20):
            sprite_data[2][x] = 'BLACK'
            sprite_data[9][x] = 'BLACK'
        
        for x in range(25, 28):
            sprite_data[2][x] = 'BLACK'
            sprite_data[9][x] = 'BLACK'
        
        # Fill ears
        for y in range(3, 9):
            for x in range(17, 20):
                sprite_data[y][x] = 'WHITE'
            for x in range(25, 28):
                sprite_data[y][x] = 'WHITE'
        
        sprite_data[5][18] = 'GRAY'
        sprite_data[5][26] = 'GRAY'
    
    # Body outline
    for x in range(10, 35):
        if 33 + tilt < height:
            sprite_data[33 + tilt][x] = 'BLACK'
        if 46 + tilt < height:
            sprite_data[46 + tilt][x] = 'BLACK'
    
    for y in range(34, 46):
        if y + tilt < height:
            sprite_data[y + tilt][9] = 'BLACK'
            sprite_data[y + tilt][35] = 'BLACK'
    
    # Arms in different positions
    if frame == 1:
        # Arms forward
        for y in range(36, 41):
            if y + tilt < height:
                sprite_data[y + tilt][5] = 'BLACK'
                sprite_data[y + tilt][10] = 'BLACK'
                sprite_data[y + tilt][34] = 'BLACK'
                sprite_data[y + tilt][39] = 'BLACK'
        
        for y in range(36, 41):
            if y + tilt < height:
                for x in range(6, 10):
                    sprite_data[y + tilt][x] = 'WHITE'
                for x in range(35, 39):
                    sprite_data[y + tilt][x] = 'WHITE'
    else:
        # Arms back
        for y in range(37, 42):
            if y + tilt < height:
                sprite_data[y + tilt][7] = 'BLACK'
                sprite_data[y + tilt][12] = 'BLACK'
                sprite_data[y + tilt][32] = 'BLACK'
                sprite_data[y + tilt][37] = 'BLACK'
        
        for y in range(37, 42):
            if y + tilt < height:
                for x in range(8, 12):
                    sprite_data[y + tilt][x] = 'WHITE'
                for x in range(33, 37):
                    sprite_data[y + tilt][x] = 'WHITE'
    
    # Fill head
    for y in range(9, 32):
        if y + tilt < height:
            for x in range(15, 30):
                sprite_data[y + tilt][x] = 'WHITE'
    
    # Fill body
    for y in range(34, 46):
        if y + tilt < height:
            for x in range(10, 35):
                sprite_data[y + tilt][x] = 'WHITE'
    
    # Eyes (always open for running)
    if 15 + tilt < height:
        sprite_data[15 + tilt][19] = 'BLACK'
        sprite_data[15 + tilt][25] = 'BLACK'
        sprite_data[15 + tilt][19] = 'WHITE'
        sprite_data[15 + tilt][25] = 'WHITE'
    if 16 + tilt < height:
        sprite_data[16 + tilt][19] = 'BLACK'
        sprite_data[16 + tilt][25] = 'BLACK'
    
    # Nose
    if 20 + tilt < height:
        sprite_data[20 + tilt][22] = 'ORANGE'
    
    # Cheeks
    if 22 + tilt < height:
        sprite_data[22 + tilt][16] = 'PINK'
        sprite_data[22 + tilt][28] = 'PINK'
    
    # Mouth
    if 24 + tilt < height:
        sprite_data[24 + tilt][21] = 'BLACK'
        sprite_data[24 + tilt][23] = 'BLACK'
    if 25 + tilt < height:
        sprite_data[25 + tilt][22] = 'BLACK'
    
    return sprite_data

def main():
    """Generate all rabbit sprites as SVG"""
    print("🐰 Generating pixel rabbit sprites...")
    
    # Ensure images directory exists
    os.makedirs('images', exist_ok=True)
    
    # Generate all sprites
    sprites = {
        'buddy_standing_still.svg': create_rabbit_standing_sprite(False),
        'buddy_standing_still_eye_closed.svg': create_rabbit_standing_sprite(True),
        'buddy_run1.svg': create_rabbit_running_sprite(1),
        'buddy_run2.svg': create_rabbit_running_sprite(2),
    }
    
    # Save sprites as SVG
    for filename, sprite_data in sprites.items():
        svg_content = create_svg_pixel_sprite(44, 47, sprite_data)
        filepath = os.path.join('images', filename)
        
        with open(filepath, 'w') as f:
            f.write(svg_content)
        
        print(f"✅ Saved {filepath}")
    
    print("🎉 All pixel rabbit sprites generated successfully!")
    print("\nSprites created (SVG format):")
    for filename in sprites.keys():
        print(f"  - images/{filename}")
    
    print("\nNote: Use the HTML sprite generator (create_pixel_rabbit_sprites.html) to convert these to PNG format if needed.")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
import numpy as np
from PIL import Image, ImageDraw

def create_buddy_sprites():
    """Create pixel art sprites for Buddy the rabbit"""
    
    # Color palette based on the provided Buddy image
    colors = {
        'bg': (0, 0, 0, 0),      # Transparent background
        'cream': (245, 235, 220), # Light cream color for main body
        'pink': (255, 182, 193),  # Pink for inner ears and cheeks
        'orange': (255, 140, 105), # Orange for nose/mouth area
        'black': (0, 0, 0),       # Black for outlines and eyes
        'white': (255, 255, 255), # White for eye highlights
        'light_blue': (173, 216, 230) # Light blue for clothing/accessories
    }
    
    # Canvas size (same as original dino sprites)
    width, height = 88, 94
    
    # Create standing still sprite
    def create_standing_still():
        img = Image.new('RGBA', (width, height), colors['bg'])
        draw = ImageDraw.Draw(img)
        
        # Draw pixel by pixel to create rabbit silhouette
        pixels = img.load()
        
        # Ears (tall rabbit ears)
        # Left ear
        for y in range(10, 35):
            for x in range(25, 30):
                pixels[x, y] = colors['black']
        for y in range(12, 33):
            for x in range(26, 29):
                pixels[x, y] = colors['cream']
        for y in range(15, 30):
            for x in range(27, 28):
                pixels[x, y] = colors['pink']
        
        # Right ear
        for y in range(10, 35):
            for x in range(35, 40):
                pixels[x, y] = colors['black']
        for y in range(12, 33):
            for x in range(36, 39):
                pixels[x, y] = colors['cream']
        for y in range(15, 30):
            for x in range(37, 38):
                pixels[x, y] = colors['pink']
        
        # Head outline
        for y in range(25, 55):
            for x in range(20, 45):
                if (x == 20 or x == 44 or y == 25 or y == 54):
                    pixels[x, y] = colors['black']
        
        # Head fill
        for y in range(26, 54):
            for x in range(21, 44):
                pixels[x, y] = colors['cream']
        
        # Eyes
        pixels[28, 35] = colors['black']
        pixels[29, 35] = colors['black']
        pixels[35, 35] = colors['black']
        pixels[36, 35] = colors['black']
        
        # Eye highlights
        pixels[28, 34] = colors['white']
        pixels[35, 34] = colors['white']
        
        # Nose
        pixels[32, 42] = colors['orange']
        
        # Cheeks
        pixels[25, 40] = colors['pink']
        pixels[39, 40] = colors['pink']
        
        # Body outline
        for y in range(55, 85):
            for x in range(22, 43):
                if (x == 22 or x == 42 or y == 55 or y == 84):
                    pixels[x, y] = colors['black']
        
        # Body fill
        for y in range(56, 84):
            for x in range(23, 42):
                pixels[x, y] = colors['light_blue']
        
        # Arms
        for x in range(18, 22):
            for y in range(60, 75):
                pixels[x, y] = colors['black'] if x == 18 or y == 60 or y == 74 else colors['cream']
        
        for x in range(43, 47):
            for y in range(60, 75):
                pixels[x, y] = colors['black'] if x == 46 or y == 60 or y == 74 else colors['cream']
        
        # Legs
        for x in range(26, 32):
            for y in range(85, 94):
                pixels[x, y] = colors['black'] if x == 26 or x == 31 or y == 85 or y == 93 else colors['cream']
        
        for x in range(33, 39):
            for y in range(85, 94):
                pixels[x, y] = colors['black'] if x == 33 or x == 38 or y == 85 or y == 93 else colors['cream']
        
        return img
    
    # Create running sprites (2 frames)
    def create_run1():
        img = create_standing_still()
        pixels = img.load()
        
        # Modify leg positions for running animation
        # Clear original legs
        for x in range(26, 39):
            for y in range(85, 94):
                pixels[x, y] = colors['bg']
        
        # Left leg forward
        for x in range(24, 30):
            for y in range(85, 94):
                pixels[x, y] = colors['black'] if x == 24 or x == 29 or y == 85 or y == 93 else colors['cream']
        
        # Right leg back
        for x in range(35, 41):
            for y in range(85, 94):
                pixels[x, y] = colors['black'] if x == 35 or x == 40 or y == 85 or y == 93 else colors['cream']
        
        return img
    
    def create_run2():
        img = create_standing_still()
        pixels = img.load()
        
        # Modify leg positions for running animation (opposite of run1)
        # Clear original legs
        for x in range(26, 39):
            for y in range(85, 94):
                pixels[x, y] = colors['bg']
        
        # Left leg back
        for x in range(25, 31):
            for y in range(85, 94):
                pixels[x, y] = colors['black'] if x == 25 or x == 30 or y == 85 or y == 93 else colors['cream']
        
        # Right leg forward
        for x in range(34, 40):
            for y in range(85, 94):
                pixels[x, y] = colors['black'] if x == 34 or x == 39 or y == 85 or y == 93 else colors['cream']
        
        return img
    
    def create_eye_closed():
        img = create_standing_still()
        pixels = img.load()
        
        # Replace eyes with closed eyes (horizontal lines)
        pixels[28, 35] = colors['black']
        pixels[29, 35] = colors['black']
        pixels[30, 35] = colors['black']
        
        pixels[34, 35] = colors['black']
        pixels[35, 35] = colors['black']
        pixels[36, 35] = colors['black']
        
        # Remove eye highlights
        pixels[28, 34] = colors['cream']
        pixels[35, 34] = colors['cream']
        
        return img
    
    # Save all sprites
    standing = create_standing_still()
    standing.save('/workspace/images/buddy_standing_still.png')
    
    run1 = create_run1()
    run1.save('/workspace/images/buddy_run1.png')
    
    run2 = create_run2()
    run2.save('/workspace/images/buddy_run2.png')
    
    eye_closed = create_eye_closed()
    eye_closed.save('/workspace/images/buddy_standing_still_eye_closed.png')
    
    print("Buddy sprites created successfully!")

if __name__ == "__main__":
    create_buddy_sprites()
#!/usr/bin/env python3
"""
Simple sprite creator for Buddy without external dependencies.
Creates basic pixel art as text representation that can be manually converted.
"""

def create_buddy_sprites_text():
    """Create text representations of Buddy sprites for manual conversion"""
    
    # Define sprite dimensions
    width, height = 88, 94
    
    # Define a simple pixel art pattern for Buddy
    # Using characters: ' ' = transparent, '#' = black outline, 'o' = cream, 'p' = pink, 'b' = blue
    
    buddy_standing = [
        "                                                                                        ",  # 0
        "                                                                                        ",  # 1
        "                                                                                        ",  # 2
        "                                                                                        ",  # 3
        "                                                                                        ",  # 4
        "                                                                                        ",  # 5
        "                                                                                        ",  # 6
        "                                                                                        ",  # 7
        "                                                                                        ",  # 8
        "                                                                                        ",  # 9
        "                         ###     ###                                                   ",  # 10
        "                         #p#     #p#                                                   ",  # 11
        "                         #p#     #p#                                                   ",  # 12
        "                         #p#     #p#                                                   ",  # 13
        "                         #p#     #p#                                                   ",  # 14
        "                         #p#     #p#                                                   ",  # 15
        "                         #p#     #p#                                                   ",  # 16
        "                         #p#     #p#                                                   ",  # 17
        "                         #p#     #p#                                                   ",  # 18
        "                         #p#     #p#                                                   ",  # 19
        "                         #p#     #p#                                                   ",  # 20
        "                         #p#     #p#                                                   ",  # 21
        "                         #p#     #p#                                                   ",  # 22
        "                         #p#     #p#                                                   ",  # 23
        "                         #p#     #p#                                                   ",  # 24
        "                    #########################                                           ",  # 25
        "                    #ooooooooooooooooooooooo#                                           ",  # 26
        "                    #ooooooooooooooooooooooo#                                           ",  # 27
        "                    #ooooooooooooooooooooooo#                                           ",  # 28
        "                    #ooooooooooooooooooooooo#                                           ",  # 29
        "                    #ooooooooooooooooooooooo#                                           ",  # 30
        "                    #ooooooooooooooooooooooo#                                           ",  # 31
        "                    #ooooooooooooooooooooooo#                                           ",  # 32
        "                    #ooooooooooooooooooooooo#                                           ",  # 33
        "                    #ooo##ooooooo##ooooooooo#                                           ",  # 34
        "                    #ooo##ooooooo##ooooooooo#                                           ",  # 35
        "                    #ooooooooooooooooooooooo#                                           ",  # 36
        "                    #ooooooooooooooooooooooo#                                           ",  # 37
        "                    #ooooooooooooooooooooooo#                                           ",  # 38
        "                    #ooooooooooooooooooooooo#                                           ",  # 39
        "                    #op ooooooooooooooo p o#                                           ",  # 40
        "                    #ooooooooooooooooooooooo#                                           ",  # 41
        "                    #ooooooooorooooooooooooo#                                           ",  # 42
        "                    #ooooooooooooooooooooooo#                                           ",  # 43
        "                    #ooooooooooooooooooooooo#                                           ",  # 44
        "                    #ooooooooooooooooooooooo#                                           ",  # 45
        "                    #ooooooooooooooooooooooo#                                           ",  # 46
        "                    #ooooooooooooooooooooooo#                                           ",  # 47
        "                    #ooooooooooooooooooooooo#                                           ",  # 48
        "                    #ooooooooooooooooooooooo#                                           ",  # 49
        "                    #ooooooooooooooooooooooo#                                           ",  # 50
        "                    #ooooooooooooooooooooooo#                                           ",  # 51
        "                    #ooooooooooooooooooooooo#                                           ",  # 52
        "                    #ooooooooooooooooooooooo#                                           ",  # 53
        "                    #########################                                           ",  # 54
        "                      #####################                                             ",  # 55
        "                      #bbbbbbbbbbbbbbbbbbb#                                             ",  # 56
        "                      #bbbbbbbbbbbbbbbbbbb#                                             ",  # 57
        "                      #bbbbbbbbbbbbbbbbbbb#                                             ",  # 58
        "                      #bbbbbbbbbbbbbbbbbbb#                                             ",  # 59
        "             ####     #bbbbbbbbbbbbbbbbbbb#     ####                                   ",  # 60
        "             #oo#     #bbbbbbbbbbbbbbbbbbb#     #oo#                                   ",  # 61
        "             #oo#     #bbbbbbbbbbbbbbbbbbb#     #oo#                                   ",  # 62
        "             #oo#     #bbbbbbbbbbbbbbbbbbb#     #oo#                                   ",  # 63
        "             #oo#     #bbbbbbbbbbbbbbbbbbb#     #oo#                                   ",  # 64
        "             #oo#     #bbbbbbbbbbbbbbbbbbb#     #oo#                                   ",  # 65
        "             #oo#     #bbbbbbbbbbbbbbbbbbb#     #oo#                                   ",  # 66
        "             #oo#     #bbbbbbbbbbbbbbbbbbb#     #oo#                                   ",  # 67
        "             #oo#     #bbbbbbbbbbbbbbbbbbb#     #oo#                                   ",  # 68
        "             #oo#     #bbbbbbbbbbbbbbbbbbb#     #oo#                                   ",  # 69
        "             #oo#     #bbbbbbbbbbbbbbbbbbb#     #oo#                                   ",  # 70
        "             #oo#     #bbbbbbbbbbbbbbbbbbb#     #oo#                                   ",  # 71
        "             #oo#     #bbbbbbbbbbbbbbbbbbb#     #oo#                                   ",  # 72
        "             #oo#     #bbbbbbbbbbbbbbbbbbb#     #oo#                                   ",  # 73
        "             ####     #bbbbbbbbbbbbbbbbbbb#     ####                                   ",  # 74
        "                      #bbbbbbbbbbbbbbbbbbb#                                             ",  # 75
        "                      #bbbbbbbbbbbbbbbbbbb#                                             ",  # 76
        "                      #bbbbbbbbbbbbbbbbbbb#                                             ",  # 77
        "                      #bbbbbbbbbbbbbbbbbbb#                                             ",  # 78
        "                      #bbbbbbbbbbbbbbbbbbb#                                             ",  # 79
        "                      #bbbbbbbbbbbbbbbbbbb#                                             ",  # 80
        "                      #bbbbbbbbbbbbbbbbbbb#                                             ",  # 81
        "                      #bbbbbbbbbbbbbbbbbbb#                                             ",  # 82
        "                      #bbbbbbbbbbbbbbbbbbb#                                             ",  # 83
        "                      #####################                                             ",  # 84
        "                        ######    ######                                               ",  # 85
        "                        #oooo#    #oooo#                                               ",  # 86
        "                        #oooo#    #oooo#                                               ",  # 87
        "                        #oooo#    #oooo#                                               ",  # 88
        "                        #oooo#    #oooo#                                               ",  # 89
        "                        #oooo#    #oooo#                                               ",  # 90
        "                        #oooo#    #oooo#                                               ",  # 91
        "                        #oooo#    #oooo#                                               ",  # 92
        "                        ######    ######                                               ",  # 93
    ]
    
    # Now create a very simple text-based sprite that we can manually convert
    print("Creating Buddy standing sprite as SVG...")
    
    svg_content = '''<?xml version="1.0" encoding="UTF-8"?>
<svg width="88" height="94" xmlns="http://www.w3.org/2000/svg">
  <!-- Ears -->
  <rect x="25" y="10" width="5" height="25" fill="black"/>
  <rect x="26" y="12" width="3" height="21" fill="#F5EBDC"/>
  <rect x="27" y="15" width="1" height="15" fill="#FFB6C1"/>
  
  <rect x="35" y="10" width="5" height="25" fill="black"/>
  <rect x="36" y="12" width="3" height="21" fill="#F5EBDC"/>
  <rect x="37" y="15" width="1" height="15" fill="#FFB6C1"/>
  
  <!-- Head -->
  <rect x="20" y="25" width="25" height="29" fill="black"/>
  <rect x="21" y="26" width="23" height="27" fill="#F5EBDC"/>
  
  <!-- Eyes -->
  <rect x="28" y="34" width="2" height="2" fill="black"/>
  <rect x="35" y="34" width="2" height="2" fill="black"/>
  <rect x="28" y="33" width="1" height="1" fill="white"/>
  <rect x="35" y="33" width="1" height="1" fill="white"/>
  
  <!-- Nose -->
  <rect x="32" y="42" width="1" height="1" fill="#FF8C69"/>
  
  <!-- Cheeks -->
  <rect x="25" y="40" width="1" height="1" fill="#FFB6C1"/>
  <rect x="39" y="40" width="1" height="1" fill="#FFB6C1"/>
  
  <!-- Body -->
  <rect x="22" y="55" width="21" height="29" fill="black"/>
  <rect x="23" y="56" width="19" height="27" fill="#ADD8E6"/>
  
  <!-- Arms -->
  <rect x="18" y="60" width="4" height="15" fill="black"/>
  <rect x="19" y="61" width="2" height="13" fill="#F5EBDC"/>
  
  <rect x="43" y="60" width="4" height="15" fill="black"/>
  <rect x="44" y="61" width="2" height="13" fill="#F5EBDC"/>
  
  <!-- Legs -->
  <rect x="26" y="85" width="6" height="9" fill="black"/>
  <rect x="27" y="86" width="4" height="7" fill="#F5EBDC"/>
  
  <rect x="33" y="85" width="6" height="9" fill="black"/>
  <rect x="34" y="86" width="4" height="7" fill="#F5EBDC"/>
</svg>'''
    
    # Save SVG files
    with open('/workspace/images/buddy_standing_still.svg', 'w') as f:
        f.write(svg_content)
    
    # Create run1 (left leg forward)
    svg_run1 = svg_content.replace(
        '<!-- Legs -->\n  <rect x="26" y="85" width="6" height="9" fill="black"/>\n  <rect x="27" y="86" width="4" height="7" fill="#F5EBDC"/>\n\n  <rect x="33" y="85" width="6" height="9" fill="black"/>\n  <rect x="34" y="86" width="4" height="7" fill="#F5EBDC"/>',
        '<!-- Legs -->\n  <rect x="24" y="85" width="6" height="9" fill="black"/>\n  <rect x="25" y="86" width="4" height="7" fill="#F5EBDC"/>\n\n  <rect x="35" y="85" width="6" height="9" fill="black"/>\n  <rect x="36" y="86" width="4" height="7" fill="#F5EBDC"/>'
    )
    
    with open('/workspace/images/buddy_run1.svg', 'w') as f:
        f.write(svg_run1)
    
    # Create run2 (right leg forward)
    svg_run2 = svg_content.replace(
        '<!-- Legs -->\n  <rect x="26" y="85" width="6" height="9" fill="black"/>\n  <rect x="27" y="86" width="4" height="7" fill="#F5EBDC"/>\n\n  <rect x="33" y="85" width="6" height="9" fill="black"/>\n  <rect x="34" y="86" width="4" height="7" fill="#F5EBDC"/>',
        '<!-- Legs -->\n  <rect x="25" y="85" width="6" height="9" fill="black"/>\n  <rect x="26" y="86" width="4" height="7" fill="#F5EBDC"/>\n\n  <rect x="34" y="85" width="6" height="9" fill="black"/>\n  <rect x="35" y="86" width="4" height="7" fill="#F5EBDC"/>'
    )
    
    with open('/workspace/images/buddy_run2.svg', 'w') as f:
        f.write(svg_run2)
    
    # Create eye closed version
    svg_eye_closed = svg_content.replace(
        '<!-- Eyes -->\n  <rect x="28" y="34" width="2" height="2" fill="black"/>\n  <rect x="35" y="34" width="2" height="2" fill="black"/>\n  <rect x="28" y="33" width="1" height="1" fill="white"/>\n  <rect x="35" y="33" width="1" height="1" fill="white"/>',
        '<!-- Eyes -->\n  <rect x="28" y="35" width="3" height="1" fill="black"/>\n  <rect x="34" y="35" width="3" height="1" fill="black"/>'
    )
    
    with open('/workspace/images/buddy_standing_still_eye_closed.svg', 'w') as f:
        f.write(svg_eye_closed)
    
    print("SVG sprites created! Now converting to PNG...")

def convert_svg_to_png():
    """Convert SVG files to PNG using available tools"""
    import subprocess
    import os
    
    svg_files = [
        'buddy_standing_still.svg',
        'buddy_run1.svg', 
        'buddy_run2.svg',
        'buddy_standing_still_eye_closed.svg'
    ]
    
    for svg_file in svg_files:
        png_file = svg_file.replace('.svg', '.png')
        svg_path = f'/workspace/images/{svg_file}'
        png_path = f'/workspace/images/{png_file}'
        
        # Try different conversion methods
        try:
            # Try inkscape
            subprocess.run(['inkscape', '-w', '88', '-h', '94', svg_path, '-o', png_path], check=True)
            print(f"Converted {svg_file} to {png_file} using Inkscape")
        except (subprocess.CalledProcessError, FileNotFoundError):
            try:
                # Try rsvg-convert
                subprocess.run(['rsvg-convert', '-w', '88', '-h', '94', svg_path, '-o', png_path], check=True)
                print(f"Converted {svg_file} to {png_file} using rsvg-convert")
            except (subprocess.CalledProcessError, FileNotFoundError):
                try:
                    # Try convert (ImageMagick)
                    subprocess.run(['convert', svg_path, png_path], check=True)
                    print(f"Converted {svg_file} to {png_file} using ImageMagick")
                except (subprocess.CalledProcessError, FileNotFoundError):
                    print(f"Could not convert {svg_file} - no suitable converter found")

if __name__ == "__main__":
    create_buddy_sprites_text()
    convert_svg_to_png()
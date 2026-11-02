#!/usr/bin/env python3
"""
Convert SVG app icon to PNG for Flutter launcher icons generation.
Requires: pip install cairosvg pillow
"""

import os
import sys

def convert_svg_to_png():
    """Convert app_icon.svg to app_icon.png at 1024x1024 resolution."""
    
    svg_path = "assets/images/app_icon.svg"
    png_path = "assets/images/app_icon.png"
    
    print("=" * 60)
    print("  Afosha Mobile App - Icon Converter")
    print("=" * 60)
    print()
    
    # Check if SVG exists
    if not os.path.exists(svg_path):
        print(f"[ERROR] SVG file not found: {svg_path}")
        sys.exit(1)
    
    print(f"[OK] Found SVG: {svg_path}")
    print()
    
    # Try cairosvg first (best quality)
    try:
        import cairosvg
        print("Using cairosvg for conversion...")
        cairosvg.svg2png(
            url=svg_path,
            write_to=png_path,
            output_width=1024,
            output_height=1024
        )
        print(f"[SUCCESS] PNG created: {png_path}")
        print(f"           Size: 1024x1024 pixels")
        print()
        return True
    except ImportError:
        print("[INFO] cairosvg not available, trying alternative method...")
        print()
    except Exception as e:
        print(f"[ERROR] cairosvg conversion failed: {e}")
        print()
    
    # Try svglib + reportlab
    try:
        from svglib.svglib import svg2rlg
        from reportlab.graphics import renderPM
        print("Using svglib for conversion...")
        drawing = svg2rlg(svg_path)
        renderPM.drawToFile(drawing, png_path, fmt="PNG", dpi=300)
        
        # Resize to exactly 1024x1024
        from PIL import Image
        img = Image.open(png_path)
        img = img.resize((1024, 1024), Image.LANCZOS)
        img.save(png_path)
        
        print(f"[SUCCESS] PNG created: {png_path}")
        print(f"           Size: 1024x1024 pixels")
        print()
        return True
    except ImportError:
        print("[INFO] svglib not available, trying PIL method...")
        print()
    except Exception as e:
        print(f"[ERROR] svglib conversion failed: {e}")
        print()
    
    # If all else fails, provide instructions
    print("[!] No SVG conversion library available!")
    print()
    print("Please install one of the following:")
    print("  Option 1 (recommended): pip install cairosvg")
    print("  Option 2: pip install svglib reportlab pillow")
    print()
    print("Or use an online converter:")
    print("  https://svgtopng.com")
    print("  https://convertio.co/svg-png/")
    print()
    print("Convert:")
    print(f"  From: {svg_path}")
    print(f"  To: {png_path}")
    print("  Size: 1024x1024 pixels")
    print()
    return False

def run_flutter_icon_generator():
    """Run Flutter launcher icons generator."""
    import subprocess
    
    print("=" * 60)
    print("  Running Flutter Icon Generator")
    print("=" * 60)
    print()
    
    try:
        # Run flutter pub get
        print("Running: flutter pub get")
        subprocess.run(["flutter", "pub", "get"], check=True)
        print("[OK] Dependencies updated")
        print()
        
        # Run flutter_launcher_icons
        print("Running: flutter pub run flutter_launcher_icons")
        subprocess.run(["flutter", "pub", "run", "flutter_launcher_icons"], check=True)
        print("[OK] Icons generated successfully!")
        print()
        
        print("=" * 60)
        print("  SUCCESS!")
        print("=" * 60)
        print()
        print("Next steps:")
        print("  1. Run: flutter clean")
        print("  2. Run: flutter pub get")
        print("  3. Run: flutter run")
        print()
        print("The new green icon will appear on your device!")
        print()
        
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Command failed: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print("[ERROR] Flutter not found in PATH!")
        print("Make sure Flutter is installed and added to your system PATH.")
        sys.exit(1)

def main():
    # Change to mobile directory
    if os.path.basename(os.getcwd()) != "mobile":
        if os.path.exists("mobile"):
            os.chdir("mobile")
        else:
            print("[ERROR] Please run this script from the project root or mobile directory")
            sys.exit(1)
    
    # Convert SVG to PNG
    if convert_svg_to_png():
        # Run Flutter icon generator
        try:
            response = input("Run Flutter icon generator now? (y/n): ").strip().lower()
            if response == 'y':
                run_flutter_icon_generator()
            else:
                print()
                print("To generate icons later, run:")
                print("  flutter pub run flutter_launcher_icons")
                print()
        except KeyboardInterrupt:
            print()
            print("Cancelled.")
            sys.exit(0)
    else:
        print("Please convert the SVG manually and then run:")
        print("  flutter pub run flutter_launcher_icons")

if __name__ == "__main__":
    main()

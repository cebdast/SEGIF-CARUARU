import os
import re

# Remote URL and local replacement
REMOTE_URL = "https://caruaru.pe.gov.br/wp-content/uploads/2018/08/Brasao-231x300.png"
PREVIOUS_LOCAL = "img/caruaru-prefeitura.png"
LOCAL_PATH = "img/brasao-caruaru.png"

# Directory to search
ROOT_DIR = r"d:\Caruaru Sistema - Local"

def fix_logo():
    count = 0
    for root, dirs, files in os.walk(ROOT_DIR):
        # Skip some directories if needed
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.git' in dirs:
            dirs.remove('.git')
            
        for file in files:
            if file.endswith(".html"):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if REMOTE_URL in content or PREVIOUS_LOCAL in content:
                        new_content = content.replace(REMOTE_URL, LOCAL_PATH).replace(PREVIOUS_LOCAL, LOCAL_PATH)
                        with open(path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Fixed: {path}")
                        count += 1
                except Exception as e:
                    print(f"Error processing {path}: {e}")
    
    print(f"\nTotal files updated: {count}")

if __name__ == "__main__":
    fix_logo()

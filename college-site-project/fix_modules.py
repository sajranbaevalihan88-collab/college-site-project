import os
import re

modules_dir = 'frontend/js/modules'
for filename in os.listdir(modules_dir):
    if filename == 'api.js': continue
    filepath = os.path.join(modules_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # remove the injected header from previous step
    content = re.sub(r'const user = window\.user;\nconst contentArea = window\.contentArea;\nconst showToast = window\.showToast;\nconst openModal = window\.openModal;\nconst loadView = window\.loadView;\n\n', '', content)
    
    # regex replace whole words: user -> window.user, contentArea -> window.contentArea, etc.
    # We must be careful not to replace `user.role` if it's already `window.user.role`.
    # It's better to just use a simple regex `\buser\b` but not `window.user`.
    content = re.sub(r'(?<!window\.)\buser\b', 'window.user', content)
    content = re.sub(r'(?<!window\.)\bcontentArea\b', 'window.contentArea', content)
    content = re.sub(r'(?<!window\.)\bshowToast\b', 'window.showToast', content)
    content = re.sub(r'(?<!window\.)\bopenModal\b', 'window.openModal', content)
    content = re.sub(r'(?<!window\.)\bloadView\b', 'window.loadView', content)
    content = re.sub(r'(?<!window\.)\bfetch\b', 'window.fetch', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

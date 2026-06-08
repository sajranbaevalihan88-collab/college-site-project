import os
import re

modules_dir = 'frontend/js/modules'
for fname in os.listdir(modules_dir):
    fpath = os.path.join(modules_dir, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove import lines
    content = re.sub(r'^import .+\n', '', content, flags=re.MULTILINE)

    # Remove 'export ' prefix from declarations
    content = re.sub(r'^export (const |function |async function )', r'\1', content, flags=re.MULTILINE)

    # api.js: make api global
    if fname == 'api.js':
        content = content.replace(
            'const api = new Api();',
            'const api = new Api();\nwindow.api = api;'
        )

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

print('Modules cleaned successfully')

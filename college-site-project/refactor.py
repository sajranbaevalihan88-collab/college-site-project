import os
import re

def extract_function(code, func_name):
    # Matches 'async function func_name(' or 'function func_name(' or 'window.func_name = '
    pattern = re.compile(rf'(async\s+function\s+{func_name}\s*\(|function\s+{func_name}\s*\(|window\.{func_name}\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>\s*{{|window\.{func_name}\s*=\s*async\s*function\s*\()')
    match = pattern.search(code)
    if not match:
        return "", code
    
    start_idx = match.start()
    
    # Find the opening brace of the function body
    brace_idx = code.find('{', start_idx)
    if brace_idx == -1:
        return "", code
        
    # Count braces to find the end of the function
    open_braces = 1
    idx = brace_idx + 1
    while idx < len(code) and open_braces > 0:
        if code[idx] == '{':
            open_braces += 1
        elif code[idx] == '}':
            open_braces -= 1
        idx += 1
        
    # include trailing semicolon if present
    if idx < len(code) and code[idx] == ';':
        idx += 1
        
    func_code = code[start_idx:idx]
    new_code = code[:start_idx] + code[idx:]
    return func_code, new_code

with open('frontend/js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

os.makedirs('frontend/js/modules', exist_ok=True)

modules = {
    'grades.js': ['renderTeacherGrades', 'saveGrade', 'renderStudentGrades', 'updateGrade', 'deleteGrade', 'getStudentAverage'],
    'attendance.js': ['renderTeacherAttendance', 'renderStudentAttendance'],
    'schedule.js': ['renderSchedule', 'loadScheduleMedia', 'viewExcelSchedule', 'deleteScheduleMedia', 'renderScheduleTable'],
    'notifications.js': ['loadNotifications', 'sendNotif', 'showToast'],
    'lessons.js': ['renderMyLessons', 'deleteLesson', 'extractYoutubeId', 'renderAllLessons', 'renderSavedLessons', 'renderAboutMe', 'saveAboutMe', 'renderLessonEditor', 'previewYoutube', 'saveLessonInfo', 'uploadLessonFile', 'switchLessonTab', 'initWhiteboard', 'saveWbState', 'loadWbPage', 'saveCurrentPageData', 'updateWbPageInfo', 'wbSetTool', 'wbUpdateStrokeWidth', 'getWbPointer', 'wbMouseDown', 'wbMouseMove', 'wbMouseUp', 'createStar', 'wbUndo', 'wbRedo', 'wbDeleteSelected', 'wbClearAll', 'wbZoomIn', 'wbZoomOut', 'wbPrevPage', 'wbNextPage', 'wbAddPage', 'wbSave', 'renderTestConstructor', '_loadLessonView']
}

for mod, funcs in modules.items():
    mod_code = "import { api } from './api.js';\n\n"
    for func in funcs:
        extracted, app_js = extract_function(app_js, func)
        if not extracted:
            continue
            
        # Convert function render(...) to window.render = function(...)
        if extracted.startswith('async function'):
            name = extracted.split()[2].split('(')[0]
            extracted = extracted.replace(f'async function {name}', f'export const {name} = async function', 1)
        elif extracted.startswith('function'):
            name = extracted.split()[1].split('(')[0]
            extracted = extracted.replace(f'function {name}', f'export const {name} = function', 1)
        elif extracted.startswith('window.'):
            # Change window.X to export const X
            extracted = re.sub(r'^window\.(\w+)\s*=', r'export const \1 =', extracted)
            
        mod_code += extracted + "\n\n"
        
        # Replace occurrences of the function in app.js with window.func_name?
        # Actually we will import them in app.js.
        
    with open(f'frontend/js/modules/{mod}', 'w', encoding='utf-8') as f:
        f.write(mod_code)

# We also need to move api.js to modules/api.js and make it export api
with open('frontend/js/api.js', 'r', encoding='utf-8') as f:
    api_js = f.read()

# Make Api exportable
api_js = api_js.replace('const api = new Api();', 'export const api = new Api();')
with open('frontend/js/modules/api.js', 'w', encoding='utf-8') as f:
    f.write(api_js)

with open('frontend/js/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

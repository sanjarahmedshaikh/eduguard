import re
import glob
import os

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove the entire <style> block containing the broken sidebar CSS
    style_pattern = re.compile(r'\s*@media \(max-width: 767px\) \{\s*body \{ overflow-y: auto !important; height: auto !important; min-height: 100vh; \}\s*\}.*?\.bottom-container > div\.flex-col \{\s*display: none !important;\s*\}\s*\}', re.MULTILINE | re.DOTALL)
    
    # Actually, a simpler regex to remove the <style>...</style> block entirely if it only contains the sidebar stuff:
    # We know the <style> block starts right after <script src="https://unpkg.com/lucide@latest"></script>
    
    # Wait, in create-exam.html, the style block is just:
    # <style>
    #     @media (max-width: 767px) { ... }
    #     #sidebar { transition: ... }
    #     @media (max-width: 767px) { ... }
    #     @media (min-width: 768px) { ... }
    # </style>
    # We can just remove it using a safer pattern
    content = re.sub(r'<style>\s*@media \(max-width: 767px\) \{[\s\S]*?</style>', '', content)

    # Now replace Tailwind classes on #sidebar
    content = content.replace(
        'class="h-screen bg-white border-r border-gray-100 flex flex-col justify-start pt-3 md:pt-6 z-50 overflow-y-auto flex-shrink-0 w-16 md:w-72 transition-all duration-300 relative"',
        'class="fixed bottom-0 left-0 right-0 h-[4.5rem] md:h-screen bg-white border-t md:border-t-0 md:border-r border-gray-100 flex flex-row md:flex-col justify-around md:justify-start pt-0 md:pt-6 z-[100] md:z-50 overflow-visible md:overflow-y-auto flex-shrink-0 w-full md:w-72 transition-all duration-300 md:relative"'
    )

    # Fix logo-container
    content = content.replace(
        'class="logo-container cursor-pointer mb-4 md:mb-10 px-2 md:px-8 w-full pt-2 flex flex-col items-center md:items-start"',
        'class="logo-container hidden md:flex cursor-pointer mb-10 px-8 w-full pt-2 flex-col items-start"'
    )

    # Fix nav-container
    content = content.replace(
        'class="nav-container flex flex-col gap-2 md:gap-3 px-2 md:px-6 w-full items-center md:items-stretch"',
        'class="nav-container contents md:flex md:flex-col md:gap-3 md:px-6 w-full md:items-stretch"'
    )

    # Fix bottom-container
    content = content.replace(
        'class="bottom-container flex mt-auto pb-4 md:pb-10 w-full px-2 md:px-8 flex-col gap-3 md:gap-4 items-center md:items-stretch"',
        'class="bottom-container contents md:flex md:mt-auto md:pb-10 w-full md:px-8 md:flex-col md:gap-4 md:items-stretch"'
    )

    # Replaces for elements inside nav/bottom containers

    # Active Link
    content = content.replace('items-center-compact flex flex-row items-center justify-start gap-4 p-2.5 md:px-5 md:py-3.5 rounded-xl md:rounded-2xl w-full',
                              'flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 p-2 md:px-5 md:py-3.5 rounded-xl md:rounded-2xl w-auto md:w-full')

    # Fix System Online div
    content = content.replace('items-center-compact flex items-center justify-start gap-3 text-[10px] font-black tracking-widest text-green-600 bg-green-50 p-2.5 md:px-4 md:py-3 rounded-xl border border-green-100 shadow-sm w-full',
                              'hidden md:flex items-center justify-start gap-3 text-[10px] font-black tracking-widest text-green-600 bg-green-50 p-2.5 md:px-4 md:py-3 rounded-xl border border-green-100 shadow-sm w-full')

    # Fix profile box
    content = content.replace('class="flex flex-col gap-3 p-0 md:p-4 bg-transparent md:bg-gray-50 rounded-2xl border-0 md:border md:border-gray-100 md:shadow-sm w-full items-center md:items-stretch"',
                              'class="hidden md:flex flex-col gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm w-full items-stretch"')
    content = content.replace('class="flex flex-col gap-3 p-0 md:p-4 bg-transparent md:bg-gray-50 rounded-2xl border-0 md:border md:border-gray-100 md:shadow-sm w-full items-stretch"',
                              'class="hidden md:flex flex-col gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm w-full items-stretch"')

    # Fix mobile profile button
    content = content.replace('class="md:hidden items-center-compact flex flex-col items-center justify-center gap-4 p-2.5 w-full transition-all text-gray-500 hover:text-indigo-600 font-bold"',
                              'class="md:hidden flex flex-col items-center justify-center gap-1 p-2 w-auto transition-all text-gray-500 hover:text-indigo-600 font-bold"')

    # Fix sign out button
    content = content.replace('items-center-compact flex items-center justify-start gap-3 p-2.5 md:px-4 md:py-3 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all font-bold w-full group',
                              'flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 p-2 md:px-4 md:py-3 text-gray-500 hover:text-red-600 md:hover:bg-red-50 border border-transparent md:hover:border-red-100 rounded-xl transition-all font-bold w-auto md:w-full group')

    # Fix texts
    content = content.replace('class="text-sm tracking-wide hidden-compact"', 'class="text-[10px] md:text-sm tracking-wide block md:inline-block mt-1 md:mt-0"')
    content = content.replace('class="text-[10px] tracking-wide hidden-compact"', 'class="text-[10px] md:text-sm tracking-wide block md:inline-block mt-1 md:mt-0"')
    content = content.replace('class="hidden-compact w-full', 'class="hidden md:block w-full')
    content = content.replace('class="hidden-compact"', 'class="hidden md:inline-block"')
    
    # Important fixes for main tag padding so content isn't hidden under the nav bar
    content = content.replace('class="flex-1 relative h-screen overflow-y-auto w-full p-4 md:p-10 pb-8 max-w-4xl mx-auto"',
                              'class="flex-1 relative h-screen overflow-y-auto w-full p-4 md:p-10 pb-24 md:pb-8 max-w-4xl mx-auto"')
    content = content.replace('class="flex-1 relative h-screen overflow-y-auto w-full p-4 md:p-10 max-w-6xl mx-auto pb-24"',
                              'class="flex-1 relative h-screen overflow-y-auto w-full p-4 md:p-10 pb-24 max-w-6xl mx-auto"')
    content = content.replace('class="flex-1 relative h-screen overflow-y-auto w-full p-4 md:p-10 pb-8 max-w-7xl mx-auto"',
                              'class="flex-1 relative h-screen overflow-y-auto w-full p-4 md:p-10 pb-24 md:pb-8 max-w-7xl mx-auto"')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

html_files = glob.glob('*.html')
for f in html_files:
    if f != 'index.html':
        print(f"Processing {f}...")
        process_file(f)

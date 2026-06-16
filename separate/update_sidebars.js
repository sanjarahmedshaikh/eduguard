const fs = require('fs');
 // Note: glob might not be installed, we can just use fs.readdirSync
const path = require('path');

function processFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    // 1. Remove the broken <style> block containing the media queries
    content = content.replace(/<style>\s*@media \(max-width: 767px\) \{[\s\S]*?<\/style>/, '');

    // 2. Fix #sidebar classes
    content = content.replace(
        'class="h-screen bg-white border-r border-gray-100 flex flex-col justify-start pt-3 md:pt-6 z-50 overflow-y-auto flex-shrink-0 w-16 md:w-72 transition-all duration-300 relative"',
        'class="fixed bottom-0 left-0 right-0 h-[4.5rem] md:h-screen bg-white border-t md:border-t-0 md:border-r border-gray-100 flex flex-row md:flex-col justify-around md:justify-start pt-0 md:pt-6 z-[100] md:z-50 overflow-visible md:overflow-y-auto flex-shrink-0 w-full md:w-72 transition-all duration-300 md:relative"'
    );

    // 3. Fix logo-container
    content = content.replace(
        'class="logo-container cursor-pointer mb-4 md:mb-10 px-2 md:px-8 w-full pt-2 flex flex-col items-center md:items-start"',
        'class="logo-container hidden md:flex cursor-pointer mb-10 px-8 w-full pt-2 flex-col items-start"'
    );

    // 4. Fix nav-container
    content = content.replace(
        'class="nav-container flex flex-col gap-2 md:gap-3 px-2 md:px-6 w-full items-center md:items-stretch"',
        'class="nav-container contents md:flex md:flex-col md:gap-3 md:px-6 w-full md:items-stretch"'
    );

    // 5. Fix bottom-container
    content = content.replace(
        'class="bottom-container flex mt-auto pb-4 md:pb-10 w-full px-2 md:px-8 flex-col gap-3 md:gap-4 items-center md:items-stretch"',
        'class="bottom-container contents md:flex md:mt-auto md:pb-10 w-full md:px-8 md:flex-col md:gap-4 md:items-stretch"'
    );

    // 6. Generic items-center-compact buttons (replace all occurrences)
    content = content.replaceAll(
        'items-center-compact flex flex-row items-center justify-start gap-4 p-2.5 md:px-5 md:py-3.5 rounded-xl md:rounded-2xl w-full',
        'flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 p-2 md:px-5 md:py-3.5 rounded-xl md:rounded-2xl w-auto md:w-full'
    );

    // 7. System Online div
    content = content.replace(
        'items-center-compact flex items-center justify-start gap-3 text-[10px] font-black tracking-widest text-green-600 bg-green-50 p-2.5 md:px-4 md:py-3 rounded-xl border border-green-100 shadow-sm w-full',
        'hidden md:flex items-center justify-start gap-3 text-[10px] font-black tracking-widest text-green-600 bg-green-50 p-2.5 md:px-4 md:py-3 rounded-xl border border-green-100 shadow-sm w-full'
    );

    // 8. Profile box container (both variations seen in files)
    content = content.replace(
        'class="flex flex-col gap-3 p-0 md:p-4 bg-transparent md:bg-gray-50 rounded-2xl border-0 md:border md:border-gray-100 md:shadow-sm w-full items-center md:items-stretch"',
        'class="hidden md:flex flex-col gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm w-full items-stretch"'
    );
    content = content.replace(
        'class="flex flex-col gap-3 p-0 md:p-4 bg-transparent md:bg-gray-50 rounded-2xl border-0 md:border md:border-gray-100 md:shadow-sm w-full items-stretch"',
        'class="hidden md:flex flex-col gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm w-full items-stretch"'
    );

    // 9. Mobile Profile Button
    content = content.replace(
        'class="md:hidden items-center-compact flex flex-col items-center justify-center gap-4 p-2.5 w-full transition-all text-gray-500 hover:text-indigo-600 font-bold"',
        'class="md:hidden flex flex-col items-center justify-center gap-1 p-2 w-auto transition-all text-gray-500 hover:text-indigo-600 font-bold"'
    );

    // 10. Sign Out Button
    content = content.replace(
        'items-center-compact flex items-center justify-start gap-3 p-2.5 md:px-4 md:py-3 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all font-bold w-full group',
        'flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 p-2 md:px-4 md:py-3 text-gray-500 hover:text-red-600 md:hover:bg-red-50 border border-transparent md:hover:border-red-100 rounded-xl transition-all font-bold w-auto md:w-full group'
    );

    // 11. Text replacements
    content = content.replaceAll('class="text-sm tracking-wide hidden-compact"', 'class="text-[10px] md:text-sm tracking-wide block md:inline-block mt-1 md:mt-0"');
    content = content.replaceAll('class="text-[10px] tracking-wide hidden-compact"', 'class="text-[10px] md:text-sm tracking-wide block md:inline-block mt-1 md:mt-0"');
    content = content.replaceAll('class="hidden-compact w-full', 'class="hidden md:block w-full');
    content = content.replaceAll('class="hidden-compact"', 'class="hidden md:inline-block"');

    // 12. Main padding fix
    content = content.replace(
        'class="flex-1 relative h-screen overflow-y-auto w-full p-4 md:p-10 pb-8 max-w-4xl mx-auto"',
        'class="flex-1 relative h-screen overflow-y-auto w-full p-4 md:p-10 pb-24 md:pb-8 max-w-4xl mx-auto"'
    );
    content = content.replace(
        'class="flex-1 relative h-screen overflow-y-auto w-full p-4 md:p-10 max-w-6xl mx-auto pb-24"',
        'class="flex-1 relative h-screen overflow-y-auto w-full p-4 md:p-10 pb-24 md:pb-8 max-w-6xl mx-auto"'
    );
    content = content.replace(
        'class="flex-1 relative h-screen overflow-y-auto w-full p-4 md:p-10 pb-8 max-w-7xl mx-auto"',
        'class="flex-1 relative h-screen overflow-y-auto w-full p-4 md:p-10 pb-24 md:pb-8 max-w-7xl mx-auto"'
    );

    fs.writeFileSync(filepath, content, 'utf8');
    console.log('Processed', filepath);
}

const files = fs.readdirSync('.');
files.filter(f => f.endsWith('.html') && f !== 'index.html').forEach(processFile);

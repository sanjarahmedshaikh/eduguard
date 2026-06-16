const fs = require('fs');

function processFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    // 1. Hide the sign out button on mobile (add 'hidden md:flex' instead of 'flex')
    // Look for the sign out button class:
    const signoutOld = 'class="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 p-2 md:px-4 md:py-3 text-gray-500 hover:text-red-600 md:hover:bg-red-50 border border-transparent md:hover:border-red-100 rounded-xl transition-all font-bold w-auto md:w-full group"';
    const signoutNew = 'class="hidden md:flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 p-2 md:px-4 md:py-3 text-gray-500 hover:text-red-600 md:hover:bg-red-50 border border-transparent md:hover:border-red-100 rounded-xl transition-all font-bold w-auto md:w-full group"';
    content = content.replace(signoutOld, signoutNew);

    // 2. Change all handleProfileClick to navigate to profile.html
    content = content.replaceAll('handleProfileClick(event)', 'sidebarNavigate(\\\'profile.html\\\')');

    // Make sure we didn't miss the desktop view profile button if it didn't use handleProfileClick(event)
    // It does use handleProfileClick(event) according to earlier HTML inspection.

    // 3. Optional: we can remove the handleProfileClick function definition from the script block
    content = content.replace(/function handleProfileClick\(e\) \{[\s\S]*?showToast\('Profile interface would open here in the full app\.'\);\s*\}/, '');

    fs.writeFileSync(filepath, content, 'utf8');
    console.log('Processed', filepath);
}

const files = fs.readdirSync('.');
files.filter(f => f.endsWith('.html') && f !== 'index.html' && f !== 'profile.html').forEach(processFile);

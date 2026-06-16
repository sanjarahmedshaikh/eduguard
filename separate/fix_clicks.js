const fs = require('fs');

function processFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    // Refactor sidebarNavigate
    content = content.replace(
        /function sidebarNavigate\(url\) \{[\s\S]*?safeNavigate\(url\);\s*\}/,
        `function sidebarNavigate(url) {\n            safeNavigate(url);\n        }`
    );

    // Refactor logout
    content = content.replace(
        /function logout\(\) \{[\s\S]*?sessionStorage\.clear\(\);\s*safeNavigate\('index\.html'\);\s*\}/,
        `function logout() {\n            sessionStorage.clear();\n            safeNavigate('index.html');\n        }`
    );

    // Refactor handleSidebarClick to be empty
    content = content.replace(
        /function handleSidebarClick\(e\) \{[\s\S]*?\}\s*\}/,
        `function handleSidebarClick(e) {\n            // Mobile bottom nav doesn't need to expand\n        }`
    );

    fs.writeFileSync(filepath, content, 'utf8');
    console.log('Processed script functions in', filepath);
}

const files = fs.readdirSync('.');
files.filter(f => f.endsWith('.html') && f !== 'index.html').forEach(processFile);

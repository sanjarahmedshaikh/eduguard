const fs = require('fs');
const files = fs.readdirSync('.');
files.filter(f => f.endsWith('.html')).forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replaceAll("sidebarNavigate('\\'profile.html\\'')", "sidebarNavigate('profile.html')");
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed', f);
});

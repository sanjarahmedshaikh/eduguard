const fs = require('fs');

function updateDashboard() {
    let content = fs.readFileSync('student-dashboard.html', 'utf8');

    // 1. In fetchExams(), add ongoing logic in the map()
    // Need to carefully replace the exam-grid rendering logic.
    const oldMapStart = `document.getElementById('exam-grid').innerHTML = availableExams.length === 0 ? \`<p class="col-span-full p-10 text-gray-500 font-bold">No active assessments available.</p>\` : availableExams.map(e => {
                    const isExpired = e.validUntil && (new Date(e.validUntil) < now);`;

    const newMapStart = `document.getElementById('exam-grid').innerHTML = availableExams.length === 0 ? \`<p class="col-span-full p-10 text-gray-500 font-bold">No active assessments available.</p>\` : availableExams.map(e => {
                    const isExpired = e.validUntil && (new Date(e.validUntil) < now);

                    const ongoingStart = localStorage.getItem(\`ongoing_exam_\${user.id}_\${e._id}\`);
                    let isOngoing = false;
                    if (ongoingStart) {
                        const elapsedMinutes = (Date.now() - parseInt(ongoingStart)) / (1000 * 60);
                        if (elapsedMinutes < e.duration + 5) {
                            isOngoing = true;
                        } else {
                            localStorage.removeItem(\`ongoing_exam_\${user.id}_\${e._id}\`);
                        }
                    }`;

    content = content.replace(oldMapStart, newMapStart);

    // 2. Replace the button HTML logic
    const oldBtn = `<button onclick="\${isExpired ? \`showToast('This exam has been expired.', 'error')\` : \`startExam('\${e._id}')\`}" class="w-full py-4 \${isExpired ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-indigo-600 active:scale-95'} rounded-2xl font-black tracking-widest uppercase text-sm transition-all flex items-center justify-center gap-2">
                            \${isExpired ? \`<i data-lucide="lock" class="w-4 h-4"></i> Expired\` : \`Start Now\`}
                        </button>`;

    const newBtn = `\${(() => {
                        if (isExpired) {
                            return \`<button onclick="showToast('This exam has been expired.', 'error')" class="w-full py-4 bg-gray-200 text-gray-500 cursor-not-allowed rounded-2xl font-black tracking-widest uppercase text-sm transition-all flex items-center justify-center gap-2"><i data-lucide="lock" class="w-4 h-4"></i> Expired</button>\`;
                        } else if (isOngoing) {
                            return \`<button disabled class="w-full py-4 bg-gray-200 text-gray-500 cursor-not-allowed rounded-2xl font-black tracking-widest uppercase text-sm transition-all flex items-center justify-center gap-2"><i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Ongoing</button>\`;
                        } else {
                            return \`<button onclick="startExam('\${e._id}')" class="w-full py-4 bg-gray-900 text-white hover:bg-indigo-600 active:scale-95 rounded-2xl font-black tracking-widest uppercase text-sm transition-all flex items-center justify-center gap-2">Start Now</button>\`;
                        }
                    })()}`;

    content = content.replace(oldBtn, newBtn);

    // 3. Update the group class to include isOngoing
    content = content.replace(
        `group \${isExpired ? 'opacity-80 grayscale-[30%]' : ''}">`,
        `group \${(isExpired || isOngoing) ? 'opacity-80 grayscale-[30%]' : ''}">`
    );

    // 4. In startExam(), set localStorage
    const oldStartExam = `sessionStorage.setItem('active_exam_id', id);

            // Open in a new popup window without navigation controls
            const windowFeatures = "menubar=no,location=no,resizable=yes,scrollbars=yes,status=no,toolbar=no,width=" + screen.width + ",height=" + screen.height;
            window.open('student-exam.html', '_blank', windowFeatures);

            // Optional: Show a message on the dashboard that the exam is running in a popup
            showToast("Exam started in a new secure window.", "success");
        }`;

    const newStartExam = `sessionStorage.setItem('active_exam_id', id);
            localStorage.setItem(\`ongoing_exam_\${user.id}_\${id}\`, Date.now().toString());

            // Open in a new popup window without navigation controls
            const windowFeatures = "menubar=no,location=no,resizable=yes,scrollbars=yes,status=no,toolbar=no,width=" + screen.width + ",height=" + screen.height;
            window.open('student-exam.html', '_blank', windowFeatures);

            // Optional: Show a message on the dashboard that the exam is running in a popup
            showToast("Exam started in a new secure window.", "success");
            
            // Re-render exams to show Ongoing state
            fetchExams();
        }

        window.addEventListener('storage', (e) => {
            if (e.key && e.key.startsWith(\`ongoing_exam_\${user.id}_\`)) {
                fetchExams();
            }
        });`;

    content = content.replace(oldStartExam, newStartExam);

    fs.writeFileSync('student-dashboard.html', content, 'utf8');
    console.log('student-dashboard.html updated successfully.');
}

updateDashboard();

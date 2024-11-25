// ==UserScript==
// @name         Enhanced Brainly Answer Extractor
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Extracts and displays answers from Brainly pages with LaTeX support (including both accepted and suggested answers)
// @author       You
// @match        https://*.brainly.com/*
// @match        https://*.brainly.in/*
// @match        https://*.brainly.ph/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const styles = `
        .answer-extractor-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 400px;
            max-height: 80vh;
            background: linear-gradient(to bottom, #ffffff, #f8faff);
            border: 1px solid rgba(65, 105, 225, 0.2);
            border-radius: 12px;
            box-shadow: 0 4px 24px rgba(65, 105, 225, 0.15);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        }

        .answer-extractor-container.minimized {
            transform: translateY(150%);
            opacity: 0;
        }

        .answer-extractor-header {
            padding: 16px;
            background: linear-gradient(135deg, #4169e1, #5c85ff);
            border-bottom: 1px solid rgba(65, 105, 225, 0.1);
            border-radius: 12px 12px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: white;
            box-shadow: 0 2px 4px rgba(65, 105, 225, 0.1);
        }

        .answer-extractor-title {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.3px;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .answer-extractor-controls {
            display: flex;
            gap: 12px;
        }

        .answer-extractor-button {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            cursor: pointer;
            padding: 6px;
            color: white;
            border-radius: 6px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .answer-extractor-button:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.05);
        }

        .answer-extractor-button:active {
            transform: scale(0.95);
        }

        .answer-extractor-content {
            padding: 16px;
            overflow-y: auto;
            max-height: calc(80vh - 70px);
            scrollbar-width: thin;
            scrollbar-color: rgba(65, 105, 225, 0.3) transparent;
        }

        .answer-extractor-content::-webkit-scrollbar {
            width: 6px;
        }

        .answer-extractor-content::-webkit-scrollbar-track {
            background: transparent;
        }

        .answer-extractor-content::-webkit-scrollbar-thumb {
            background-color: rgba(65, 105, 225, 0.3);
            border-radius: 3px;
        }

        .answer-extractor-answer {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(65, 105, 225, 0.1);
            animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .answer-extractor-answer:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }

        .answer-extractor-meta {
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            color: #4a5568;
        }

        .answer-extractor-premium {
            background: linear-gradient(135deg, #ffd700, #ffa500);
            color: #000;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 4px rgba(255, 215, 0, 0.2);
        }

        .answer-extractor-text {
            line-height: 1.6;
            color: #2d3748;
        }

        .answer-extractor-toggle {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 20px;
            background: linear-gradient(135deg, #4169e1, #5c85ff);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            z-index: 9999;
            font-weight: 600;
            letter-spacing: 0.3px;
            box-shadow: 0 4px 12px rgba(65, 105, 225, 0.3);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .answer-extractor-toggle.hidden {
            transform: scale(0.8);
            opacity: 0;
            pointer-events: none;
        }

        .answer-extractor-toggle:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(65, 105, 225, 0.4);
            background: linear-gradient(135deg, #5c85ff, #4169e1);
        }

        .answer-extractor-toggle:active {
            transform: translateY(1px);
            box-shadow: 0 2px 8px rgba(65, 105, 225, 0.3);
        }
    `;

    // Add KaTeX CSS
    const katexCss = document.createElement('link');
    katexCss.rel = 'stylesheet';
    katexCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css';
    document.head.appendChild(katexCss);

    // Add our custom styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

function processLatex(text) {
    if (!text) return '';

    text = text.replace(/\[tex\](.*?)\[\/tex\]/g, '\\[$1\\]');

    text = text.replace(/\$([^$]+)\$/g, '\\($1\\)');

    text = text.replace(/\$\$([^$]+)\$\$/g, '\\[$1\\]');

    return text;
}

    function extractBrainlyAnswers() {
        try {
            const jsonLdScript = document.querySelector('script#head-JSON-LD');
            if (!jsonLdScript) {
                throw new Error('JSON-LD data not found');
            }

            const jsonLd = JSON.parse(jsonLdScript.textContent);
            const mainEntity = jsonLd['@graph'][0].mainEntity;

            if (!mainEntity) {
                return [];
            }

            const allAnswers = [];

            if (mainEntity.acceptedAnswer) {
                const acceptedAnswers = Array.isArray(mainEntity.acceptedAnswer) ?
                    mainEntity.acceptedAnswer : [mainEntity.acceptedAnswer];

                allAnswers.push(...acceptedAnswers.map(answer => ({
                    author: answer.author.name,
                    text: processLatex(answer.text),
                    date: answer.dateCreated,
                    isAccessible: answer.isAccessibleForFree,
                    type: 'accepted',
                    upvotes: answer.upvoteCount || 0
                })));
            }

            if (mainEntity.suggestedAnswer) {
                const suggestedAnswers = Array.isArray(mainEntity.suggestedAnswer) ?
                    mainEntity.suggestedAnswer : [mainEntity.suggestedAnswer];

                allAnswers.push(...suggestedAnswers.map(answer => ({
                    author: answer.author.name,
                    text: processLatex(answer.text),
                    date: answer.dateCreated,
                    isAccessible: answer.isAccessibleForFree,
                    type: 'suggested',
                    upvotes: answer.upvoteCount || 0
                })));
            }

            return allAnswers.sort((a, b) => {
                if (b.upvotes !== a.upvotes) {
                    return b.upvotes - a.upvotes;
                }
                return new Date(b.date) - new Date(a.date);
            });
        } catch (error) {
            console.error('Error extracting answers:', error);
            return [];
        }
    }

    function createAnswersDisplay(answers) {
        const toggleButton = document.createElement('button');
        toggleButton.className = 'answer-extractor-toggle';
        toggleButton.textContent = 'Show Answers';
        document.body.appendChild(toggleButton);

        const container = document.createElement('div');
        container.className = 'answer-extractor-container minimized';

        const header = document.createElement('div');
        header.className = 'answer-extractor-header';
        header.innerHTML = `
            <h3 class="answer-extractor-title">Brainly Answers (${answers.length})</h3>
            <div class="answer-extractor-controls">
                <button class="answer-extractor-button answer-extractor-minimize" title="Minimize">
                    <svg width="14" height="2" viewBox="0 0 14 2" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
                <button class="answer-extractor-button answer-extractor-close" title="Close">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        `;

        const content = document.createElement('div');
        content.className = 'answer-extractor-content';

        if (answers.length === 0) {
            content.innerHTML = '<p>No answers found.</p>';
        } else {
            content.innerHTML = answers.map((answer, index) => `
                <div class="answer-extractor-answer">
                    <div class="answer-extractor-meta">
                        <div>
                            <strong>Answer #${index + 1}</strong> by ${answer.author}<br>
                            ${new Date(answer.date).toLocaleDateString()}
                            ${answer.type === 'accepted' ?
                                '<span style="color: #00aa00; margin-left: 8px;">✓ Accepted</span>' :
                                ''}
                            ${answer.upvotes > 0 ?
                                `<span style="color: #666; margin-left: 8px;">↑${answer.upvotes}</span>` :
                                ''}
                        </div>
                        ${answer.isAccessible === 'False' ?
                            '<span class="answer-extractor-premium">PREMIUM</span>' :
                            ''}
                    </div>
                    <div class="answer-extractor-text">
                        ${answer.text}
                    </div>
                </div>
            `).join('');
        }

        container.appendChild(header);
        container.appendChild(content);
        document.body.appendChild(container);

        toggleButton.addEventListener('click', () => {
            container.classList.remove('minimized');
            toggleButton.classList.add('hidden');
        });

        header.querySelector('.answer-extractor-close').addEventListener('click', () => {
            container.remove();
            toggleButton.remove();
        });

        header.querySelector('.answer-extractor-minimize').addEventListener('click', () => {
            container.classList.add('minimized');
            toggleButton.classList.remove('hidden');
        });

        renderMathInElement(content, {
            delimiters: [
                {left: '\\(', right: '\\)', display: false},
                {left: '\\[', right: '\\]', display: true}
            ],
            throwOnError: false
        });
    }

    function init() {
        if (!window.location.pathname.includes('/question/')) {
            return;
        }

        const answers = extractBrainlyAnswers();
        createAnswersDisplay(answers);

        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 'a') {
                const existing = document.querySelector('.answer-extractor-container');
                const toggleBtn = document.querySelector('.answer-extractor-toggle');

                if (existing && toggleBtn) {
                    existing.remove();
                    toggleBtn.remove();
                } else {
                    const answers = extractBrainlyAnswers();
                    createAnswersDisplay(answers);
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

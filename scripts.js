    // --- Global State ---
    let allQuestions = [];
    let quizQuestions = [];
    let currentQuestionIndex = 0;
    let score = 0; // CRITICAL: This global variable must be updated correctly
    let isAnswered = false;

    // --- Utility Functions ---

    const getUniqueTopics = () => {
        const topics = allQuestions.map(q => q.topic);
        return [...new Set(topics)].sort();
    };

    const shuffleArray = (array) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    // --- Core Quiz Data Handling ---
    // This handles data fetching on both index.html (no quizConfig) and quiz.html (with quizConfig)
    const loadQuestions = async (quizConfig = null) => {
        const loaderElement = document.getElementById('quiz-container') || document.getElementById('quiz-interface');
        const loadingMessage = quizConfig ? "Loading quiz data..." : "Loading question data...";
        
        loaderElement.innerHTML = `
            <div class="text-center p-8 header-box">
                <div class="loading-spinner"></div>
                <p class="text-xl text-neon-green font-semibold">${loadingMessage}</p>
                <p class="text-gray-400 mt-2">Attempting to read questions.json...</p>
            </div>
        `;

        try {
            const response = await fetch('questions.json');
            if (!response.ok) {
                throw new Error(`File not found or server error (Status: ${response.status}).`);
            }
            
            const jsonText = await response.text();
            allQuestions = JSON.parse(jsonText);

            if (!Array.isArray(allQuestions) || allQuestions.length === 0) {
                loaderElement.innerHTML = `
                    <div class="text-center p-8 header-box shadow-neon-red">
                        <p class="text-red-400 font-bold text-xl">Data Error: File is Empty or Invalid</p>
                        <p class="text-gray-400 mt-2">The file 'questions.json' was loaded but did not contain a valid, non-empty array of questions.</p>
                    </div>
                `;
                return;
            }

            if (quizConfig) {
                // Quiz page logic
                prepareQuiz(quizConfig.mode, quizConfig.subject);
            } else {
                // Index page dashboard logic
                renderStartScreen();
            }

        } catch (error) {
            console.error('Fatal Error during JSON load:', error);
            loaderElement.innerHTML = `
                <div class="text-center p-8 header-box shadow-neon-red">
                    <p class="text-red-400 font-bold text-xl">Failed to Load Questions Data</p>
                    <p class="text-gray-400 mt-2">Check console for details. Error: ${error.message}</p>
                </div>
            `;
        }
    };

    // --- Dashboard Logic (index.html) ---

    const renderStartScreen = () => {
        const topics = getUniqueTopics();
        const maxMixed = allQuestions.length;
        const quizContainer = document.getElementById('quiz-container');

        const topicOptions = topics.map(topic => `
            <option value="${topic}" class="bg-gray-700 text-gray-200">${topic} (${allQuestions.filter(q => q.topic === topic).length} Qs)</option>
        `).join('');

        quizContainer.innerHTML = `
            <div class="space-y-8">
                <p class="text-xl text-gray-300 text-center">
                    Choose a mode and topic to start your revision.
                </p>

                <!-- 1. Mixed Random Modes -->
                <div class="p-6 header-box shadow-neon-green">
                    <h2 class="text-2xl font-bold text-neon-green mb-4 border-b border-gray-600 pb-2">Mixed (Random) Quizzes</h2>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button onclick="startQuiz('random_100')"
                            class="neon-button-blue w-full">
                            ${Math.min(100, maxMixed)} Random Questions
                        </button>
                        <button onclick="startQuiz('random_20')"
                            class="neon-button-blue w-full">
                            ${Math.min(20, maxMixed)} Random Questions
                        </button>
                    </div>
                </div>

                <!-- 2. Subject-Specific Modes -->
                <div class="p-6 header-box neon-border shadow-neon-blue">
                    <h2 class="text-2xl font-bold text-neon-blue mb-4 border-b border-gray-600 pb-2">Subject-Specific Quizzes</h2>
                    <label for="subject-select" class="block text-lg font-medium text-gray-300 mb-2">
                        Choose Subject:
                    </label>
                    <select id="subject-select"
                        class="w-full border-2 border-gray-600 p-3 rounded-lg bg-gray-700 text-gray-200 focus:ring-neon-green focus:border-neon-green shadow-sm mb-4">
                        <option value="" disabled selected class="text-gray-400">-- Select a Subject --</option>
                        ${topicOptions}
                    </select>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button id="all-subject-btn" onclick="startQuiz('all')"
                            class="neon-button-green disabled:opacity-50" disabled>
                            All Subject Questions
                        </button>
                        <button id="random-10-btn" onclick="startQuiz('random_10')"
                            class="neon-button-green disabled:opacity-50" disabled>
                            10 Random Questions of Subject
                        </button>
                    </div>
                </div>
            </div>
        `;

        const subjectSelect = document.getElementById('subject-select');
        const allBtn = document.getElementById('all-subject-btn');
        const tenBtn = document.getElementById('random-10-btn');

        const toggleButtons = () => {
            const isSelected = subjectSelect.value !== "";
            allBtn.disabled = !isSelected;
            tenBtn.disabled = !isSelected;
        };

        subjectSelect.addEventListener('change', toggleButtons);
        toggleButtons();
    };

    const startQuiz = (mode) => {
        const subjectSelect = document.getElementById('subject-select');
        const subject = subjectSelect ? subjectSelect.value : '';

        let url = `quiz.html?mode=${mode}`;
        if (subject) {
            url += `&subject=${encodeURIComponent(subject)}`;
        }

        if (mode === 'random_20' || mode === 'random_100') {
            const size = (mode === 'random_100') ? 100 : 20;
            url += `&size=${Math.min(size, allQuestions.length)}`;
        }

        window.location.href = url;
    };

    window.onload = () => {
        // Check if we are on index.html (the dashboard) or quiz.html
        const isDashboard = document.getElementById('quiz-container');
        if (isDashboard) {
            // Only load questions on the dashboard if it's the index page
            loadQuestions();
        }
    };


    // --- Quiz Preparation and Runtime Logic (quiz.html) ---

    const prepareQuiz = (mode, subject) => {
        let filteredQuestions = [];

        if (subject && subject !== 'null') {
            filteredQuestions = allQuestions.filter(q => q.topic === subject);
        } else {
            filteredQuestions = allQuestions; 
        }

        if (mode === 'all' && subject) {
            quizQuestions = filteredQuestions;
        } else if (mode === 'random_10' && subject) {
            quizQuestions = shuffleArray(filteredQuestions).slice(0, 10);
        } else if (mode === 'random_20' || mode === 'random_100') {
            const quizSize = (mode === 'random_100') ? 100 : 20;
            quizQuestions = shuffleArray(filteredQuestions).slice(0, quizSize);
        } else {
            quizQuestions = shuffleArray(filteredQuestions).slice(0, 10);
        }

        if (quizQuestions.length === 0) {
            const interface = document.getElementById('quiz-interface');
            interface.innerHTML = `<p class="text-red-400 text-center text-xl p-8 header-box">No questions found for the selected quiz configuration.</p>
            <div class="flex justify-center mt-6">
                <button onclick="window.location.href='index.html'" class="neon-button-blue">
                    Go to Dashboard
                </button>
            </div>`;
            return;
        }

        // Reset global state for a new quiz
        score = 0;
        currentQuestionIndex = 0;
        isAnswered = false;
        renderQuestion();
    };

    const renderQuestion = () => {
        const quizInterface = document.getElementById('quiz-interface');

        if (currentQuestionIndex >= quizQuestions.length) {
            return renderResults();
        }

        const q = quizQuestions[currentQuestionIndex];
        isAnswered = false;

        // IMPORTANT: Note the addition of 'window.' below to ensure global accessibility
        const optionsHtml = q.options.map((optionText, index) => `
            <button data-index="${index}" onclick="window.handleAnswer(${index})"
                class="option-button w-full text-left py-4 px-6 rounded-lg shadow-sm focus:outline-none text-base">
                ${optionText}
            </button>
        `).join('');

        const progress = `${currentQuestionIndex + 1} / ${quizQuestions.length}`;

        quizInterface.innerHTML = `
            <div class="header-box neon-border p-6 md:p-8 shadow-neon-blue">
                <div class="flex flex-col md:flex-row justify-between items-start mb-4 border-b border-gray-700 pb-3">
                    <div class="text-lg text-neon-blue font-bold">Topic: ${q.topic}</div>
                    <div class="text-lg text-gray-400 font-medium md:mt-0 mt-2">
                        ID: ${q.id}
                    </div>
                </div>
                
                <div class="question-box p-6 rounded-xl mb-8">
                    <p class="text-xl md:text-2xl font-semibold leading-relaxed">${q.question.replace(/\n/g, '<br>')}</p>
                </div>

                <div id="options-container" class="space-y-4 mb-8">
                    ${optionsHtml}
                </div>

                <div class="flex flex-col items-center justify-center pt-4 border-t border-gray-700">
                    <div id="feedback-message" class="text-xl font-bold mb-4"></div>
                    <button id="next-button" onclick="window.nextQuestion()"
                        class="neon-button-blue w-full sm:w-60 opacity-50 cursor-not-allowed"
                        disabled>
                        Next Question &rarr;
                    </button>
                </div>
            </div>
            <div class="text-center mt-4">
                <div class="text-xl font-bold text-neon-green bg-gray-700 inline-block px-4 py-1 rounded-full">
                    Progress: ${progress}
                </div>
            </div>
        `;
    };

    // EXPOSE FUNCTIONS TO WINDOW SCOPE (CRITICAL FIX)
    window.handleAnswer = (selectedIndex) => {
        if (isAnswered) return;
        isAnswered = true;

        const currentQ = quizQuestions[currentQuestionIndex];
        const correctAnswerIndex = currentQ.answerIndex;
        const optionButtons = document.querySelectorAll('.option-button');
        const nextButton = document.getElementById('next-button');
        const feedbackMessage = document.getElementById('feedback-message');

        let isCorrect = false;

        optionButtons.forEach((btn, index) => {
            btn.disabled = true; 
            
            if (index === correctAnswerIndex) {
                btn.classList.add('option-correct');
                if (index === selectedIndex) {
                    isCorrect = true; // Mark as correct answer selected
                }
            } else if (index === selectedIndex) {
                btn.classList.add('option-incorrect');
            }
        });

        // --- SCORING & MESSAGE LOGIC ---
        if (isCorrect) {
            score++; // Increment score only if the selection matched the correct answer index
            
        } 
        nextButton.classList.remove('opacity-50', 'cursor-not-allowed');
        nextButton.classList.add('neon-button-blue', 'hover:opacity-100');
        nextButton.disabled = false;
        nextButton.textContent = currentQuestionIndex === quizQuestions.length - 1 ? 'Show Final Results' : 'Next Question →';
    };

    window.nextQuestion = () => {
        currentQuestionIndex++;
        renderQuestion();
    };

    const renderResults = () => {
        const quizInterface = document.getElementById('quiz-interface');
        const totalQuestions = quizQuestions.length;
        const percentage = totalQuestions > 0 ? ((score / totalQuestions) * 100).toFixed(1) : 0;

        let feedbackText = '';
        let feedbackColor = '';

        if (percentage >= 80) {
            feedbackText = "Excellent! You are well-prepared. Time for the exam!";
            feedbackColor = 'text-neon-green';
        } else if (percentage >= 60) {
            feedbackText = "Solid performance. Review your weak topics to lock in that score.";
            feedbackColor = 'text-neon-blue';
        } else {
            feedbackText = "Keep studying! Focus on foundational concepts and retest often.";
            feedbackColor = 'text-red-400';
        }

        quizInterface.innerHTML = `
            <div class="header-box neon-border p-8 text-center shadow-neon-blue">
                <h2 class="text-4xl font-extrabold text-neon-green mb-4">Quiz Complete!</h2>
                <div class="p-6 bg-gray-800 rounded-xl shadow-inner my-6">
                    <p class="text-xl font-semibold text-gray-300 mb-2">Your Final Score:</p>
                    <p class="text-7xl font-black ${feedbackColor} animate-pulse">${score}</p>
                    <p class="text-3xl font-bold text-gray-300 mt-2">out of ${totalQuestions}</p>
                    <p class="text-2xl font-bold ${feedbackColor} mt-2">(${percentage}%)</p>
                </div>
                <p class="text-xl font-semibold text-gray-300">${feedbackText}</p>

                <div class="mt-8 space-y-4">
                    <button onclick="window.location.reload()"
                        class="neon-button-green w-full sm:w-80">
                        Retake This Quiz
                    </button>
                    <button onclick="window.location.href='index.html'"
                        class="neon-button-blue w-full sm:w-80">
                        Go to Dashboard
                    </button>
                </div>
            </div>
        `;
    };
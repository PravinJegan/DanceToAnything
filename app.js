import{
    PoseLandmarker,
    FilesetResolver,
    DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

const FPS = 30;
const FRAME_TIME_MS = 1000 / 30;
const DEAD_ZONE_RADIANS = 0.05;
const OK_SCORE_THRESHOLD = 70;
const GOOD_SCORE_THRESHOLD = 85;

const homeScreen = document.getElementById('home-screen');
const selectScreen = document.getElementById('select-screen');
const gameScreen = document.getElementById('game-screen');

const enterAppBtn = document.getElementById('enter-app-btn');
const btnYoutube = document.getElementById('btn-youtube');
const btnLocal = document.getElementById('btn-local');
const localFileInput = document.getElementById('local-file-input');
const youtubeInputScreen = document.getElementById('youtube-input-screen');
const youtubeUrlInput = document.getElementById('youtube-url-input');
const loadYoutubeBtn = document.getElementById('load-youtube-btn');
const endingScreen = document.getElementById('ending-screen');
const finalScoreDisplay = document.getElementById('final-score-display');
const backToSelectBtn = document.getElementById('back-to-select-btn');

let activeVideoSource = "youtube";

let youtube_video;
let runningMode = "VIDEO";
let lastVideoTime = -1;
let peopleCount = 1;
let personNum = 1;
let startPressed = false
let youtubeLink = null;


let player_all = [];
let true_score_all = [];
const last_draw_times = new Map();


let playerLandmarker = null;
let videoLandmarker = null;
let isModelLoading = false;

// 2. UPGRADED SCREEN SWITCHER: Resets opacity for ALL screens to prevent freezing!
function switchScreen(targetScreen, hashName) {
    window.location.hash = hashName;
    
    // Hide everything
    if (homeScreen) { homeScreen.classList.add('invisible'); homeScreen.style.opacity = '1'; }
    if (selectScreen) { selectScreen.classList.add('invisible'); selectScreen.style.opacity = '1'; }
    if (youtubeInputScreen) { youtubeInputScreen.classList.add('invisible'); youtubeInputScreen.style.opacity = '1';}
    if (gameScreen) { gameScreen.classList.add('invisible'); gameScreen.style.opacity = '1'; }
    if (endingScreen) { endingScreen.classList.add('invisible'); endingScreen.style.opacity = '1'; }
    // Reveal target
    if (targetScreen) {
        targetScreen.classList.remove('invisible');
        targetScreen.style.opacity = '1';
    }

    if (hashName === "game") {
        startcamera();
    }
}

// 3. EVENT LISTENERS
if (enterAppBtn) {
    enterAppBtn.addEventListener('click', () => {
        homeScreen.style.opacity = '0';
        setTimeout(() => {
            switchScreen(selectScreen, "select");
        }, 500);
    });
}

if (btnYoutube) {
    btnYoutube.addEventListener('click', () => {
        activeVideoSource = "youtube";
        switchScreen(youtubeInputScreen, "youtube-input");
    });
}


// 2. YouTube Input Screen -> Extract ID -> Go to Game Screen
if (loadYoutubeBtn) {
    loadYoutubeBtn.addEventListener('click', () => {
        const rawUrl = youtubeUrlInput.value.trim();
        
        // Regex magic to find the 11-character YouTube video ID inside the link
        const match = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?\/\s]{11})/);
        
        if (match && match[1]) {
            const extractedVideoId = match[1];
            console.log("Successfully extracted ID:", extractedVideoId);
            
            // Tell the hidden YouTube API to queue up this new video!
            if (youtubePlayer && typeof youtubePlayer.cueVideoById === 'function') {
                youtubePlayer.cueVideoById(extractedVideoId);
            }
            
            // Now launch the game
            switchScreen(gameScreen, "game");
        } else {
            // Flash the border red if they pasted a bad link
            youtubeUrlInput.style.borderColor = "#ff0000";
            setTimeout(() => { youtubeUrlInput.style.borderColor = "#555555"; }, 1000);
        }
    });
}

if (btnLocal && localFileInput) {
    btnLocal.addEventListener('click', () => {
        activeVideoSource = "local";
        console.log("Source set to:", activeVideoSource);
        localFileInput.click();
    });

    localFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            console.log("User selected local file:", file.name);
            const fileURL = URL.createObjectURL(file);
            
            // Pass to a local video player element
            const localPlayer = document.getElementById('youtube_capture_feed');
            if (localPlayer) {
                localPlayer.src = fileURL;
            }
            switchScreen(gameScreen, "game");
        }
    });
}

if (backToSelectBtn) {
    backToSelectBtn.addEventListener('click', () => {
        switchScreen(selectScreen, "select");
    });
}

// 4. THE SPA ROUTER MEMORY CHECK
function handleRouting() {
    const currentHash = window.location.hash;

    // SAFETY NET: If the user hits "Back" to leave the game screen, 
    // we must pause the video and hide the scoreboards!
    if (currentHash !== "#game" && startPressed) {
        startPressed = false;
        
        if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
            youtubePlayer.pauseVideo();
        }
        
        // Hide score HUDs and restore the Start button
        const totalScoreBox = document.getElementById('total-score');
        const currentScoreBox = document.getElementById('current-score');
        const startBtn = document.getElementById('start-btn');
        
        if (totalScoreBox) totalScoreBox.classList.add('invisible');
        if (currentScoreBox) currentScoreBox.classList.add('invisible');
        if (startBtn) startBtn.classList.remove('invisible');
    }

    // Route to the correct screen
    if (currentHash === "#game") {
        switchScreen(gameScreen, "game");
    } else if (currentHash === "#select") {
        switchScreen(selectScreen, "select");
    } else if (currentHash === "#youtube-input") {
        switchScreen(youtubeInputScreen, "youtube-input");
    } else if (currentHash === "#end") {
        switchScreen(endingScreen, "end"); 
    } else {
        switchScreen(homeScreen, "");
    }
}

// 1. Run the router instantly when the page first loads/refreshes
window.addEventListener("DOMContentLoaded", handleRouting);

// 2. Run the router EVERY TIME the user clicks the physical Back or Forward buttons!
window.addEventListener("hashchange", handleRouting);


///fuctions start here

setInterval(() => 
    { // just to print out all the sciore for each fram to make sure running at 30 frames 
    const latest_camera = player_all.at(-1) || "No webcam data yet";
    const latest_video = true_score_all.at(-1) || "No YouTube data yet";
    console.log("player scores",latest_camera, "\nplayer frame count", player_all.length);
    console.log("video scores",latest_video, "\nvideo frame count", true_score_all.length);
    }, 1000);



let youtubePlayer = null;
window.onYouTubeIframeAPIReady = function() {
    youtubePlayer = new YT.Player('youtube-player', {
        height: "100%",
        width: "100%",
        videoId: 'dQw4w9WgXcQ', //CHANGE VIDEO
        playerVars: {
            'autoplay': 0,
            'playsinline': 1,
            'controls': 0,
            'iv_load_policy': 3,    // Kills video annotations and interactive cards
            'modestbranding': 1,    // Removes the YouTube logo watermark
            'rel': 0,               // Prevents end-screen recommendation grids from overlapping
            'disablekb': 1,
            'origin': window.location.origin      
        },
        events: {
            'onStateChange': function(event) {
                // event.data === 0 means the YouTube video finished!
                if (event.data === 0 && startPressed) {
                    endGame();
                }
            }
        }
    });
};

const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

const totalScoreBox = document.getElementById('total-score');
const currentScoreBox = document.getElementById('current-score');

document.getElementById('start-btn').addEventListener('click', async () => {


    await posetracker();
    const video_underlay = document.getElementById('youtube_capture_feed');
    const line_overlay = document.getElementById('line_overlay_youtube');
    const youtube_div = document.getElementById('video_div');

    totalScoreBox.classList.remove('invisible');
    currentScoreBox.classList.remove('invisible');

    // Wipe capture arrays
    player_all.length = 0;
    true_score_all.length = 0;

    // Reset all scoring trackers back to zero
    totalAccuracy = 0;
    frameCount = 0;
    totalAccuracyPercent = 0;
    lastGradedFrame = -1;
    recentScores.length = 0; // Empty the conveyor belt!



    last_draw_times.clear();
    smoothState.clear();

    if (activeVideoSource === "youtube")
        {
        try {
            document.getElementById('start-btn').classList.toggle('invisible');
            const stream = await navigator.mediaDevices.getDisplayMedia({ 
                video: { frameRate: FPS }, 
                audio: true ,
                preferCurrentTab: true,       // 1. Opens the popup directly to the "This Tab" tab instead of "Entire Screen"
                selfBrowserSurface: 'include', // 2. Guarantees your current webpage is included and pre-selected in the list
                surfaceSwitching: 'include'
            });

            
            if (window.CropTarget) {
                const [videoTrack] = stream.getVideoTracks();
                const cropTarget = await CropTarget.fromElement(youtube_div);
                await videoTrack.cropTo(cropTarget);
                console.log("croped video");
            } else {
                console.warn("cant crop video");
            }
            video_underlay.srcObject = stream;
            video_underlay.play();


            video_underlay.addEventListener("loadeddata", () => // arrow fuction so it satrts intvar only after drabones happens which only happens after the video loads 
            {
                if (youtubePlayer && typeof youtubePlayer.playVideo === 'function') {
            youtubePlayer.playVideo();
        }
            startPressed = true;
            last_draw_times.clear();
            totalScoreBox.classList.remove('invisible');
            currentScoreBox.classList.remove('invisible');
            drawBones(true_score_all, line_overlay, video_underlay, videoLandmarker) // It just saying right after we get the video to do the ai over lay draw bones iswhats gonna draw bones need parnetese
        
            });
        } catch (err) {
            console.error("users said no to screen", err);
            document.getElementById('start-btn').classList.remove('invisible');
        }
        youtubePlayer.playVideo(); // AD A IF STATMENT TO MAKE SURE THE VIDEO LOADS LATER!!!
        youtubePlayer.unMute();
        youtubePlayer.setVolume(100);
    }

    else if (activeVideoSource === "local") {
        document.getElementById('start-btn').classList.add('invisible');
        
        // Hide the YouTube iframe container so it doesn't block your local video!
        document.getElementById('youtube-player').style.display = "none";
        
        // Make sure the local video is visible
        video_underlay.style.display = "block";
        video_underlay.style.width = "100%";
        video_underlay.style.height = "100%";
        
        // Just play the file directly
        video_underlay.play();
        startPressed = true;
        drawBones(true_score_all, line_overlay, video_underlay, videoLandmarker);

        video_underlay.play();
        startPressed = true;
        
        //Listen for the local MP4 file ending
        video_underlay.onended = () => {
            if (activeVideoSource === "local" && startPressed) {
                endGame();
            }
        };

        drawBones(true_score_all, line_overlay, video_underlay, videoLandmarker);
    }

});
//Brings Back button
const invisCover = document.getElementById('temp-cover');
invisCover.addEventListener("click", () => {
    if (player_all.length === 0 && true_score_all.length === 0) return;

    const video_underlay = document.getElementById('youtube_capture_feed');

    // IF THE GAME IS CURRENTLY PAUSED -> RESUME IT
    if (!startPressed) {
        startPressed = true;
        last_draw_times.clear();
        
        // Un-dim the scores to show the game is live again
        totalScoreBox.style.opacity = '1';
        currentScoreBox.style.opacity = '1';
        
        // Resume the correct video source
        if (activeVideoSource === "youtube" && youtubePlayer) {
            youtubePlayer.playVideo();
        } else if (activeVideoSource === "local") {
            video_underlay.play();
        }
    } 
    // IF THE GAME IS CURRENTLY PLAYING -> PAUSE IT
    else {
        startPressed = false;
        
        // Dim the scores to visually show the user it is paused
        totalScoreBox.style.opacity = '0.5';
        currentScoreBox.style.opacity = '0.5';
        
        // Pause the correct video source
        if (activeVideoSource === "youtube" && youtubePlayer) {
            youtubePlayer.pauseVideo();
        } else if (activeVideoSource === "local") {
            video_underlay.pause();
        }
    }
});

async function posetracker() {
    if (playerLandmarker && videoLandmarker) return;

    if (isModelLoading) {
        while (!playerLandmarker || !videoLandmarker) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return;
    }

    isModelLoading = true;

    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    const modelType = "full"; // Options: "lite", "full", "heavy"
    const options = {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_"+ modelType + "/float16/1/pose_landmarker_"+ modelType + ".task",
            delegate: "GPU"
        },
        runningMode: runningMode,
        numPoses: peopleCount
    };

    playerLandmarker = await PoseLandmarker.createFromOptions(vision, options);
    videoLandmarker = await PoseLandmarker.createFromOptions(vision, options);
    console.log("AI Model has been loade from online");
}

async function startcamera(){
    await posetracker();
    const video_underlay = document.getElementById('camera');
    const line_overlay = document.getElementById('line_overlay');

navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video_underlay.srcObject = stream;
    video_underlay.addEventListener("loadeddata", () => // arrow fuction so it satrts intvar only after drabones happens which only happens after the video loads 
        {
            
        drawBones(player_all, line_overlay, video_underlay, playerLandmarker) // It just saying right after we get the video to do the ai over lay draw bones iswhats gonna draw bones need parnetese
    })  
    
});

}

function getAngle(p1, p2) {
    if (!p1 || !p2 || p1.visibility < 0.6 || p2.visibility < 0.6) {
        return null; 
    }
    return Math.atan2(p1.y - p2.y, p1.x - p2.x);
}

const smoothState = new Map(); // key: video element, value: last smoothed landmarks
function smoothLandmarks(video, raw, alpha = 0.35) {
    let prev = smoothState.get(video);
    if (!prev) { prev = raw.map(p => ({...p})); smoothState.set(video, prev); return prev; }
    const next = raw.map((p, i) => ({
        x: prev[i].x + alpha * (p.x - prev[i].x),
        y: prev[i].y + alpha * (p.y - prev[i].y),
        visibility: p.visibility
    }));
    smoothState.set(video, next);
    return next;
}

async function drawBones(player_array, canvas, video, landmarkerType) {

    window.requestAnimationFrame( ()=> {drawBones(player_array, canvas, video, landmarkerType)})//this is asking the javascrpit bofre next computer diplay frame draw the things that need to be drawn so its only doing it for the refresh rate

    if (!video || video.readyState < 2 || video.paused || video.ended) { //if video not on dont start 
    return; 
}

    if (canvas) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }
}

    const isLiveStream = Boolean(video.srcObject);
    const currentClockType = isLiveStream ? performance.now() : video.currentTime;
    const frame_time = isLiveStream ? (FRAME_TIME_MS) : (1/FPS);
    const tolerance = isLiveStream ? 2 : 0.002;

    let lastTime = last_draw_times.get(video);
    if (lastTime === undefined) {
        lastTime = currentClockType;
        last_draw_times.set(video, lastTime);
    }

    
    if (currentClockType - lastTime >= (frame_time - tolerance)){ 

        let nextDrawTime = lastTime + frame_time;
        last_draw_times.set(video, nextDrawTime);

        let result = landmarkerType.detectForVideo(video, performance.now());
        
        let landmark = null;
        if (result.landmarks && result.landmarks.length > 0) {
            landmark = smoothLandmarks(video, result.landmarks[0]);
            }

        let player_frame = [null,null,null,null,null,null,null,null,null,null]

        if (canvas){
        const canvasCtx = canvas.getContext('2d');
        const drawingUtils = new DrawingUtils(canvasCtx);
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height) //clears canves before next lien

        if (landmark && canvas){ //this is drawig the connecters and points based on connectons
        //for (const landmark of result.landmarks){
            drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS /* PoseLandmarker is capital becase POSE_CONNECTIONS just tells what pots are connected to what */, {color: "Blue", lineWidth : 10});
            drawingUtils.drawLandmarks(landmark, {color: "Red", radius : 5});
        //}
        }
        }

    

        

        if (landmark){ //this is drawig the connecters and points based on connectons
        //for (const landmark of result.landmarks){
            player_frame = [
                /* 0 right forearm     */ getAngle(landmark[14], landmark[16]),
                /* 1 right upper arm   */ getAngle(landmark[12], landmark[14]),
                /* 2 right body        */ getAngle(landmark[24], landmark[12]),
                /* 3 right upper leg   */ getAngle(landmark[24], landmark[26]),
                /* 4 right lower leg   */ getAngle(landmark[26], landmark[28]),
                /* 5 left forearm      */ getAngle(landmark[13], landmark[15]),
                /* 6 left upper arm    */ getAngle(landmark[11], landmark[13]),
                /* 7 left body         */ getAngle(landmark[23], landmark[11]),
                /* 8 left upper leg    */ getAngle(landmark[23], landmark[25]),
                /* 9 left lower leg    */ getAngle(landmark[25], landmark[27]),
            ];
        //console.log("angles:", player_frame);
        //}
        }
        if (startPressed){
            if (isLiveStream) {
                player_array.push({
                    time: performance.now() / 1000,
                    angles: player_frame
                });
            } else {
                player_array.push({
                    time: video.currentTime,
                    angles: player_frame
                });
            }
            tryGradingNewFrame();
        }
    }
}


let totalAccuracy = 0;
let frameCount = 0;
let totalAccuracyPercent = 0;

let lastGradedFrame = -1;

const recentScores = [];

function scoreFromDiff(diff) {
    const deadZone = DEAD_ZONE_RADIANS;                 // ~6°, still counts as a perfect match
    if (diff <= deadZone) return 100;
    const t = (diff - deadZone) / (Math.PI - deadZone);
    return (1 - Math.pow(t, 1.5)) * 100;  // forgiving near zero, steeper further out
}

function tryGradingNewFrame() {
    if (!startPressed) return;

    // The target array index we need to grade next (e.g., 0, then 1, then 2...)
    const targetIndex = lastGradedFrame + 1;

    // THE HANDSHAKE: Only proceed if BOTH arrays have successfully pushed this exact index!
    if (player_all.length > targetIndex && true_score_all.length > targetIndex) {
        
        // Grab the exact matching frame pair (Frame 10 vs Frame 10)
        const playerScore = player_all[targetIndex].angles;
        const videoScore = true_score_all[targetIndex].angles;

        let currentFrameAccuracy = 0;
        let validJoints = 0;

        for (let i = 0; i < 10; i++) {
            if (playerScore[i] !== null && videoScore[i] !== null) {
                let diff = Math.abs(playerScore[i] - videoScore[i]);
                if (diff > Math.PI) {
                    diff = (2 * Math.PI) - diff;
                }
                let jointAccuracy = scoreFromDiff(diff);
                currentFrameAccuracy += jointAccuracy;
                validJoints++;
            }
            else if (playerScore[i] == null && videoScore[i] !== null)
            {
                currentFrameAccuracy += 50;
                validJoints++;
            }
        }

        // If visible joints were found, record the grade and update the UI instantly!
        if (validJoints > 0) {
            // Grade this specific single frame
            const frameScore = Math.round(currentFrameAccuracy / validJoints);
            
            // --- A. CALCULATE OVERALL SCORE (Left Side) ---
            totalAccuracy += frameScore;
            frameCount++;
            totalAccuracyPercent = Math.round(totalAccuracy / frameCount);

            // --- B. CALCULATE 10-FRAME MOVING AVERAGE (Right Side) ---
            recentScores.push(frameScore);
            if (recentScores.length > 10) {
                recentScores.shift(); // Drops the oldest frame once we exceed 10
            }
            
            // Sum the recent array and divide by its current length
            const recentSum = recentScores.reduce((sum, val) => sum + val, 0);
            const currentAverage = Math.round(recentSum / recentScores.length);

            // --- C. UPDATE UI & COLOR CODING ---
            updateHudBox(totalScoreBox, "OVERALL", totalAccuracyPercent);
            updateHudBox(currentScoreBox, "CURRENT", currentAverage);
        }


        // Lock this frame so it NEVER gets double-counted!
        lastGradedFrame = targetIndex;
    }
}

function updateHudBox(boxElement, label, score) {
    boxElement.innerText = `${label}: ${score}%`;
    
    if (score >= GOOD_SCORE_THRESHOLD) {
        boxElement.style.color = "#00ff00";      
    } else if (score >= OK_SCORE_THRESHOLD) {
        boxElement.style.color = "#ffff00"; 
    } else {
        boxElement.style.color = "#ff0000";                      
    }
}

function endGame() {
    startPressed = false;
    
    // Hide game HUDs and reset start button
    totalScoreBox.classList.add('invisible');
    currentScoreBox.classList.add('invisible');
    document.getElementById('start-btn').classList.remove('invisible');
    
    // Set the giant final score text and matching color!
    finalScoreDisplay.innerText = `${totalAccuracyPercent}%`;
    if (totalAccuracyPercent >= GOOD_SCORE_THRESHOLD) {
        finalScoreDisplay.style.color = "#00ff00";
    } else if (totalAccuracyPercent >= OK_SCORE_THRESHOLD) {
        finalScoreDisplay.style.color = "#ffff00";
    } else {
        finalScoreDisplay.style.color = "#ff0000";
    }

    // Kill the screen-share recording so the red dot goes away
    const video_underlay = document.getElementById('youtube_capture_feed');
    if (video_underlay && video_underlay.srcObject) {
         video_underlay.srcObject.getTracks().forEach(track => track.stop());
    }

    // Teleport to the ending screen!
    switchScreen(endingScreen, "end");
}




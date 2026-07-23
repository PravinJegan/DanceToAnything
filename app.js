import{
    PoseLandmarker,
    FilesetResolver,
    DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";


let youtube_video;
let runningMode = "VIDEO";
let lastVideoTime = -1;
let peopleCount = 1;
let personNum = 1;
let startPressed = false


let player_all = [];
let true_score_all = [];
const last_draw_times = new Map();


let playerLandmarker = null;
let videoLandmarker = null;
let isModelLoading = false;

///fuctions start here
posetracker();
startcamera();
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
        videoId: 'WlK1ol0mGhI', //CHANGE VIDEO undertail: WlK1ol0mGhI. jst dance :3Kbxs-lpIZQ
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
    });
};

const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);


document.getElementById('start-btn').addEventListener('click', async () => {

    await posetracker();
    const video_underlay = document.getElementById('youtube_capture_feed');
    const line_overlay = document.getElementById('line_overlay_youtube');
    const youtube_div = document.getElementById('video_div');

    try {
        document.getElementById('start-btn').classList.toggle('invisable');
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
            video: { frameRate: 30 }, 
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
            
        startPressed = true;
        last_draw_times.clear();
        drawbones(true_score_all, line_overlay, video_underlay, videoLandmarker) // It just saying right after we get the video to do the ai over lay draw bones iswhats gonna draw bones need parnetese
        scoreDisplay.classList.remove('invisable');
        });
    } catch (err) {
        console.error("users said no to screen", err);
        document.getElementById('start-btn').classList.remove('invisable');
    }
    youtubePlayer.playVideo(); // AD A IF STATMENT TO MAKE SURE THE VIDEO LOADS LATER!!!
    youtubePlayer.unMute();
    youtubePlayer.setVolume(100);
});
//gets the button to reappere
const invisCover = document.getElementById('temp-cover');
invisCover.addEventListener("click", () =>{
document.getElementById('start-btn').classList.remove('invisable');
youtubePlayer.pauseVideo();
startPressed = false;
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
            
        drawbones(player_all, line_overlay, video_underlay, playerLandmarker) // It just saying right after we get the video to do the ai over lay draw bones iswhats gonna draw bones need parnetese
    })  
    
});

}

function getAngle(p1, p2) {
    if (!p1 || !p2 || p1.visibility < 0.6 || p2.visibility < 0.6) {
        return null; 
    }
    return Math.atan2(p1.y - p2.y, p1.x - p2.x);
}

async function drawbones(player_array, canvas, video, landmarkerType) {

    window.requestAnimationFrame( ()=> {drawbones(player_array, canvas, video, landmarkerType)})//this is asking the javascrpit bofre next computer diplay frame draw the things that need to be drawn so its only doing it for the refresh rate

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
    const frame_time = isLiveStream ? (1000/30) : (1/30);
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
        
        let player_frame = [null,null,null,null,null,null,null,null,null,null]

        if (canvas){
        const canvasCtx = canvas.getContext('2d');
        const drawingUtils = new DrawingUtils(canvasCtx);
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height) //clears canves before next lien

        if (result.landmarks && canvas){ //this is drawig the connecters and points based on connectons
            for (const landmark of result.landmarks){
                drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS /* PoseLandmarker is capital becase POSE_CONNECTIONS just tells what pots are connected to what */, {color: "Blue", lineWidth : 10});
                drawingUtils.drawLandmarks(landmark, {color: "Red", radius : 5});
            }
        }
        }

    

        

        if (result.landmarks){ //this is drawig the connecters and points based on connectons
            for (const landmark of result.landmarks){
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
            }
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


const scoreDisplay = document.getElementById('score-display');

let totalAccuracy = 0;
let frameCount = 0;
let totalAccuracyPercent = 0;

let lastGradedFrame = -1;

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
                let jointAccuracy = (1 - (diff / Math.PI)) * 100;
                currentFrameAccuracy += jointAccuracy;
                validJoints++;
            }
        }

        // If visible joints were found, record the grade and update the UI instantly!
        if (validJoints > 0) {
            const frameScore = Math.round(currentFrameAccuracy / validJoints);
            
            totalAccuracy += frameScore;
            frameCount++;
            totalAccuracyPercent = Math.round(totalAccuracy / frameCount);

            scoreDisplay.innerText = `${totalAccuracyPercent}%`;
        }
        if (totalAccuracyPercent >= 85) {
            scoreDisplay.style.color = "#00ff00";      
        } else if (totalAccuracyPercent >= 70) {
            scoreDisplay.style.color = "#ffff00"; 
        } else {
            scoreDisplay.style.color = "#ff0000";                      
        }

        console.log(totalAccuracy);
        console.log(frameCount);


        // Lock this frame so it NEVER gets double-counted!
        lastGradedFrame = targetIndex;
    }
}
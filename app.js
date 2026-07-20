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


let player_all = [];
let true_score_all = [];
const last_draw_times = new Map();


let poseLandmarker = null;
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

/*window.onYouTubeIframeAPIReady = function() {
    new YT.Player('youtube-player', {
        height: '360',
        width: '640',
        videoId: 'eqjFmsZGBSc', 
        events: {
            'onReady': async (event) => {
                await posetracker();
                const youtubeVideo = document.querySelector('#youtube-player video');
                const line_overlay = document.getElementById('line_overlay_youtube');
                
                youtubeVideo.crossOrigin = "anonymous";
                youtubeVideo.muted = true; 
                youtubeVideo.playbackRate = 1.0; 
                
                console.log("youtube score count");
                drawbones(true_score_all, line_overlay_youtube, youtubeVideo); 
            }
        }
    });
};
*/

// 1. DEFINE THE RECEIVER FUNCTION FIRST
window.onYouTubeIframeAPIReady = function() {
    console.log("1. Google API loaded! Building player...");
    new YT.Player('youtube-player', {
        height: '360',
        width: '640',
        videoId: 'eqjFmsZGBSc', 
        playerVars: {
            'autoplay': 1,
            'playsinline': 1
        },
        events: {
            'onReady': async (event) => {
                console.log("2. Player built! Force-starting video...");
                event.target.playVideo();
                
                await posetracker();
                
                // Poll every 100ms until the internal video tag physically appears
                const pollForVideo = setInterval(() => {
                    const youtubeVideo = document.querySelector('#youtube-player video');
                    if (youtubeVideo) {
                        clearInterval(pollForVideo);
                        
                        youtubeVideo.crossOrigin = "anonymous";
                        youtubeVideo.muted = true; 
                        
                        console.log("3. Video hooked! Running MediaPipe engine...");
                        drawbones(true_score_all, document.getElementById('line_overlay_youtube'), youtubeVideo); 
                    }
                }, 100);
            }
        }
    });
};

// 2. INJECT GOOGLE'S SCRIPT SECOND (So it can never miss the function above!)
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);


async function posetracker() {
    if (poseLandmarker) return poseLandmarker;

    if (isModelLoading) {
        while (!poseLandmarker) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return poseLandmarker;
    }

    isModelLoading = true;

    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU"
        },
        runningMode: runningMode,
        numPoses: peopleCount
    });

    console.log("AI Model has been loade from online");
    
    return poseLandmarker;
}

async function startcamera(){
    await posetracker();
    const video_underlay = document.getElementById('camera');
    const line_overlay = document.getElementById('line_overlay');

navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video_underlay.srcObject = stream;
    video_underlay.addEventListener("loadeddata", () => // arrow fuction so it satrts intvar only after drabones happens which only happens after the video loads 
        {
            
        drawbones(player_all, line_overlay, video_underlay) // It just saying right after we get the video to do the ai over lay draw bones iswhats gonna draw bones need parnetese
    })  
    
});

}


async function drawbones(player_array, canvas, video) {

    window.requestAnimationFrame( ()=> {drawbones(player_array, canvas, video)})//this is asking the javascrpit bofre next computer diplay frame draw the things that need to be drawn so its only doing it for the refresh rate

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

    let lastTime = last_draw_times.get(video) || 0;

    if (currentClockType - lastTime >= frame_time){ 

        let nextDrawTime = currentClockType - (lastTime % frame_time);
        last_draw_times.set(video, nextDrawTime);

        let result = poseLandmarker.detectForVideo(video, performance.now());
        
        let player_frame = [null,null,null,null,null,null,null,null,null,null]

        if (canvas){
        const canvasCtx = canvas.getContext('2d');
        const drawingUtils = new DrawingUtils(canvasCtx);
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height) //clears canves before next lien

        if (result.landmarks && canvas){ //this is drawig the connecters and points based on connectons
            for (const landmark of result.landmarks){
                drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS /* PoseLandmarker is capital becase POSE_CONNECTIONS just tells what pots are connected to what */, {color: "Blue", lineWidth : 4});
                drawingUtils.drawLandmarks(landmark, {color: "Red", radius : 5});
            }
        }
        }

    

        

        if (result.landmarks){ //this is drawig the connecters and points based on connectons
            for (const landmark of result.landmarks){
                player_frame = [
                /* 0 right forearm     */Math.atan2(landmark[14].y - landmark[16].y, landmark[14].x - landmark[16].x),
                /* 1 right upper arm   */Math.atan2(landmark[12].y - landmark[14].y, landmark[12].x - landmark[14].x),
                /* 2 right body        */Math.atan2(landmark[24].y - landmark[12].y, landmark[24].x - landmark[12].x),
                /* 3 right upper leg   */Math.atan2(landmark[24].y - landmark[26].y, landmark[24].x - landmark[26].x),
                /* 4 right lower leg   */Math.atan2(landmark[26].y - landmark[28].y, landmark[26].x - landmark[28].x),
                /* 5 left forearm      */Math.atan2(landmark[13].y - landmark[15].y, landmark[13].x - landmark[15].x),
                /* 6 left upper arm    */Math.atan2(landmark[11].y - landmark[13].y, landmark[11].x - landmark[13].x),
                /* 7 left body         */Math.atan2(landmark[23].y - landmark[11].y, landmark[23].x - landmark[11].x),
                /* 8 left upper leg    */Math.atan2(landmark[23].y - landmark[25].y, landmark[23].x - landmark[25].x),
                /* 9 left lower leg    */Math.atan2(landmark[25].y - landmark[27].y, landmark[25].x - landmark[27].x),
            ];
            //console.log("angles:", player_frame);
            }
        }
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
    
    }
}

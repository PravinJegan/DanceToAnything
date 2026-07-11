import{
    PoseLandmarker,
    FilesetResolver,
    DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

const video = document.getElementById('camera');
const line_overlay = document.getElementById('line_overlay');

const canvasCtx = line_overlay.getContext('2d');

let poseLandmarker;
let runningMode = "VIDEO";
let lastVideoTime = -1;
let peopleCount = 1;


async function posetracker() {
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

    startcamera();
}

function startcamera(){
navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video.srcObject = stream;
    //video.addEventListener("loadeddata", drawbones) // this is for later it just saying right after we get the video to do the ai over lay draw bones iswhats gonna draw bones 

});

}

posetracker();


const drawingUtils = new DrawingUtils(canvasCtx);

async function drawbones() {

    line_overlay.width = video.videoWidth;
    line_overlay.height = video.videoheight;


    let time = performance.now();

    if (lastVideoTime !== video.currentTime){
        lastVideoTime = video.currentTime;

        poseLandmarker.detectForVideo(Video,lastVideoTime, (result) => {
            
            canvasCtx.clearRect(0, 0, line_overlay.width, line_overlay.length)
            
        })


    }

}
'use strict'

let startButton = document.getElementById('startButton');
let callButton = document.getElementById('callButton');
let hangupButton = document.getElementById('hangupButton');

callButton.disabled = true;
hangupButton.disabled = true;

startButton.onclick = function () {
    log('Requesting local stream');
    startButton.disabled = true;
    navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true
    })
    .then(gotStream)
    .catch(function (err) {
        alert('getUserMedia() error: ' + err.name);
    });
};

let startTime;
let localVideo = document.getElementById('localVideo');
let remoteVideo = document.getElementById('remoteVideo');

let localStream;
let pc1;
let pc2;
let offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};

let gotStream = function (stream) {
    log('Received local stream');
    localVideo.srcObject = stream;
    window.localStream = localStream = stream;
}

let log = function (msg) {
    console.log(msg);
}
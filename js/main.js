'use strict'

var startButton = document.getElementById('startButton');
var callButton = document.getElementById('callButton');
var hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;
startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

var startTime;
var localVideo = document.getElementById('localVideo');
var remoteVideo = document.getElementById('remoteVideo');

localVideo.addEventListener('loadedmetadata', function () {
    log('Local video videoWidth: ' + this.videoWidth 
    + 'px, videoHeight: ' + this.videoHeight + 'px');
});

remoteVideo.addEventListener('loadedmetadata', function () {
    log('Remote video videoWidth: ' + this.videoWidth 
    + 'px, videoHeight: ' + this.videoHeight + 'px');
});

remoteVideo.onresize = function() {
    log('Remote video size changed to ' 
    + remoteVideo.videoWidth + 'x'
    + remoteVideo.videoHeight);

    if (startTime) {
        var elapsedTime = window.performance.now() - startTime;
        log('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
        startTime = null;
    }
};

var localStream;
var pc1;
var pc2;
var offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};

function gotStream(stream) {
    log('Received local stream');
    localVideo.srcObject = stream;
    window.localStream = localStream = stream;
    callButton.disabled = false;
};

function start() {
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



function getName(pc) {
    return (pc === pc1) ? 'pc1' : 'pc2';
};

function getOtherPc(pc) {
    return (pc === pc1) ? pc2 : pc1;
};

function onAddIceCandidateSuccess(peerConnection) {
    log(getName(peerConnection) + ' addIceCandidate success');
};

function onAddIceCandidateError(peerConnection, err) {
    log(getName(peerConnection) + ' failed to add ICE Candidate: ' + err.toString());
};

function onIceCandidate(peerConnection, event) {
    if (event.candidate) {
        getOtherPc(peerConnection)
            .addIceCandidate(new RTCIceCandidate(event.candidate))
            .then(function () {
                onAddIceCandidateSuccess(peerConnection);
            },
            function (err) {
                onAddIceCandidateError(peerConnection, err);
            });
        log(getName(peerConnection) + ' ICE candidate: \n' + event.candidate.candidate);
    }
};

function onIceStateChange(peerConnection, event) {
    if (peerConnection) {
        log(getName(peerConnection) + ' ICE state: ' + peerConnection.iceConnectionState);
        log('ICE state chage event: ' + event);
    }
};

function gotRemoteStream(event) {
    window.remoteStream = remoteVideo.srcObject = event.stream;
    log('pc2 received remote stream');
};

function onSetLocalSuccess(peerConnection) {
    log(getName(peerConnection) + ' setLocalDescription complete');
};

function onSetRemoteSuccess(peerConnection) {
    log(getName(peerConnection) + ' setRemoteDescription complete');
};

function onSetSessionDescriptionError(err) {
    log('Failed to set session description: ' + err.toString());
};

function onCreateSessionDescriptionError(err) {
    log('Failed to create session description: ' + err.toString());
};

function onCreateAnswerSuccess(desc) {
    log('Answer from pc2:\n' + desc.sdp);
    log('pc2 setLocalDescription start');
    pc2.setLocalDescription(desc)
       .then(function () {
           onSetLocalSuccess(pc2);
       },
       onSetSessionDescriptionError);
    log('pc1 setRemoteDescription start');
    pc1.setRemoteDescription(desc)
       .then(function () {
           onSetRemoteSuccess(pc1);
       },
       onSetSessionDescriptionError);
};

function onCreateOfferSuccess(desc) {
    log('Offer from pc1\n' + desc.sdp);
    
    log('pc1 setLocalDescription start');
    pc1.setLocalDescription(desc)
       .then(function () {
           onSetLocalSuccess(pc1);
       },
       onSetSessionDescriptionError);
    
    log('pc2 setRemoteDescription start');
    pc2.setRemoteDescription(desc)
       .then(function () {
           onSetRemoteSuccess(pc2);
       },
       onSetSessionDescriptionError);

    log('pc2 createAnswer start');

    pc2.createAnswer()
       .then(onCreateAnswerSuccess, onCreateSessionDescriptionError);
};



function call() {
    callButton.disabled = true;
    hangupButton.disabled = false;
    log('Starting call');

    startTime = window.performance.now();
    
    var videoTracks = localStream.getVideoTracks();
    var audioTracks = localStream.getAudioTracks();

    if (videoTracks.length > 0) {
        log('Using video device: ' + videoTracks[0].label);
    }

    if (audioTracks.length > 0) {
        log('Using audio device: ' + audioTracks[0].label);
    }

    window.pc1 = pc1 = new RTCPeerConnection();
    log('Created local peer connection object pc1');
    pc1.onicecandidate = function (event) {
        onIceCandidate(pc1, event);
    };

    window.pc2 = pc2 = new RTCPeerConnection();
    log('Created remote peer connection object pc2');
    pc2.onicecandidate = function (event) {
        onIceCandidate(pc2, event);
    };

    pc1.oniceconnectionstatechange = function (event) {
        onIceStateChange(pc1, event);
    };

    pc2.oniceconnectionstatechange = function (event) {
        onIceStateChange(pc2, event);
    };

    pc2.onaddstream = gotRemoteStream;

    pc1.addStream(localStream);
    log('Added local stream to pc1');

    log('pc1 createOffer start');
    pc1.createOffer(offerOptions)
       .then(
           onCreateOfferSuccess, 
           onCreateSessionDescriptionError);
};



function hangup() {
    log('Ending call');
    pc1.close();
    pc2.close();
    pc1 = null;
    pc2 = null;
    hangupButton.disabled = true;
    callButton.disabled = false;
};

function log(msg) {
    console.log(msg);
}
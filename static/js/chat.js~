
if (!console || !console.log) {
  var console = {
    log: function() {}
  };
}

// Ugh, globals.
var peerc;
var source = new EventSource("events");

$("#incomingCall").modal();
$("#incomingCall").modal("hide");

$("#incomingCall").on("hidden", function() {
  document.getElementById("incomingRing").pause();
});

source.addEventListener("ping", function(e) {}, false);

source.addEventListener("userjoined", function(e) {
  appendUser(e.data);
}, false);

source.addEventListener("userleft", function(e) {
  removeUser(e.data);
}, false);

source.addEventListener("offer", function(e) {
  var offer = JSON.parse(e.data);
  document.getElementById("incomingUser").innerHTML = offer.from;
  document.getElementById("incomingAccept").onclick = function() {
    $("#incomingCall").modal("hide");
    acceptCall(offer);
  };
  $("#incomingCall").modal();
  document.getElementById("incomingRing").play();
}, false);

source.addEventListener("answer", function(e) {
  var answer = JSON.parse(e.data);
  peerc.setRemoteDescription(JSON.parse(answer.answer), function() {
    console.log("Call established!");
  }, error);
}, false);

function log(info) {
  var d = document.getElementById("debug");
  d.innerHTML += info + "\n\n";
}

function appendUser(user) {
  var d = document.createElement("div");
  d.setAttribute("id", btoa(user));

  var a = document.createElement("a");
  a.setAttribute("class", "btn btn-block btn-inverse");
  a.setAttribute("onclick", "initiateCall('" + user + "');");
  a.innerHTML = "<i class='icon-user icon-white'></i> " + user;

  d.appendChild(a);
  d.appendChild(document.createElement("br"));
  document.getElementById("users").appendChild(d);
}

function removeUser(user) {
  var d = document.getElementById(btoa(user));
  if (d) {
    document.getElementById("users").removeChild(d);
  }
}

// TODO: refactor, this function is almost identical to initiateCall().
function acceptCall(offer) {
  log("Incoming call with offer " + offer);
  document.getElementById("main").style.display = "none";
  document.getElementById("call").style.display = "block";

  navigator.mozGetUserMedia({video:true, audio:true}, function(vs) {
    document.getElementById("localvideo").mozSrcObject = vs;
    document.getElementById("localvideo").play();

    var pc = new mozRTCPeerConnection();
    pc.addStream(vs);

    pc.onaddstream = function(obj) {
      log("Got onaddstream of type " + obj.type);
      if (obj.type == "video") {
        document.getElementById("remotevideo").mozSrcObject = obj.stream;
        document.getElementById("remotevideo").play();
      } else {
        document.getElementById("remoteaudio").mozSrcObject = obj.stream;
        document.getElementById("remoteaudio").play();
      }
      document.getElementById("dialing").style.display = "none";
      document.getElementById("hangup").style.display = "block";
    };

    pc.setRemoteDescription(JSON.parse(offer.offer), function() {
      log("setRemoteDescription, creating answer");
      pc.createAnswer(function(answer) {
        pc.setLocalDescription(answer, function() {
          // Send answer to remote end.
          log("created Answer and setLocalDescription " + JSON.stringify(answer));
          peerc = pc;
          jQuery.post(
            "answer", {
              to: offer.from,
              from: offer.to,
              answer: JSON.stringify(answer)
            },
            function() { console.log("Answer sent!"); }
          ).error(error);
        }, error);
      }, error);
    }, error);
  }, error);
}

function initiateCall(user) {
  document.getElementById("main").style.display = "none";
  document.getElementById("call").style.display = "block";

  navigator.mozGetUserMedia({video:true, audio:true}, function(vs) {
    document.getElementById("localvideo").mozSrcObject = vs;
    document.getElementById("localvideo").play();

    var pc = new mozRTCPeerConnection();
    pc.addStream(vs);

    pc.onaddstream = function(obj) {
      log("Got onaddstream of type " + obj.type);
      if (obj.type == "video") {
        document.getElementById("remotevideo").mozSrcObject = obj.stream;
        document.getElementById("remotevideo").play();
      } else {
        document.getElementById("remoteaudio").mozSrcObject = obj.stream;
        document.getElementById("remoteaudio").play();
      }
      document.getElementById("dialing").style.display = "none";
      document.getElementById("hangup").style.display = "block";
    };

    pc.createOffer(function(offer) {
      log("Created offer" + JSON.stringify(offer));
      pc.setLocalDescription(offer, function() {
        // Send offer to remote end.
        log("setLocalDescription, sending to remote");
        peerc = pc;
        jQuery.post(
          "offer", {
            to: user,
            from: document.getElementById("user").innerHTML,
            offer: JSON.stringify(offer)
          },
          function() { console.log("Offer sent!"); }
        ).error(error);
      }, error);
    }, error);
  }, error);
}

function endCall() {
  log("Ending call");
  document.getElementById("call").style.display = "none";
  document.getElementById("main").style.display = "block";

  document.getElementById("localvideo").pause();
  document.getElementById("remotevideo").pause();
  document.getElementById("remoteaudio").pause();

  document.getElementById("localvideo").src = null;
  document.getElementById("remotevideo").src = null;
  document.getElementById("remoteaudio").src = null;

  peerc = null;
}

function error(e) {
  if (typeof e == typeof {}) {
    alert("Oh no! " + JSON.stringify(e));
  } else {
    alert("Oh no! " + e);
  }
  endCall();
}

var express = require("express"),
    https   = require("https"),
    app     = express();

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.use(express.bodyParser());
app.use(express.cookieParser("thisistehsecret"));

app.use(express.session());
app.use(express.static(__dirname + "/static"));

app.get("/", function(req, res) {
  res.redirect("/login");
});

app.get("/login", function(req, res) {
  if (req.session.user) {
    res.redirect("/chat");
    return;
  }

  // ejs complains about undefined variable?
  res.locals.message = "";
  res.locals.offline = true;
  if (req.query.err) {
    res.locals.message = req.query.err;
  }
  if (process.env.ONLINE) {
    res.locals.offline = false;
  }
  res.render("login");
});

app.get("/chat", function(req, res) {
  if (!req.session.user) {
    doRedirect("Access denied, try logging in?", res);
    return;
  }
  res.locals.user = req.session.user;
  res.render("chat");
});

app.get("/events", function(req, res) {
  if (!req.session.user) {
    res.send(401, "Unauthorized, events access denied");
    return;
  }

  // Setup event channel.
  res.type("text/event-stream");
  res.write("event: ping\n");
  res.write("data: ping\n\n");

  // First notify this user of all users current.
  var keys = Object.keys(users);
  for (var i = 0; i < keys.length; i++) {
    var user = keys[i];
    res.write("event: userjoined\n");
    res.write("data: " + user + "\n\n");
  }

  // Add to current list of online users.
  users[req.session.user] = res;
});

app.post("/offer", function(req, res) {
  if (!req.session.user) {
    res.send(401, "Unauthorized, offer access denied");
    return;
  }

  if (!req.body.to || !req.body.from || !req.body.offer) {
    res.send(400, "Invalid offer request");
    return;
  }

  var channel = users[req.body.to];
  if (!channel) {
    res.send(400, "Invalid user for offer");
    return;
  }

  channel.write("event: offer\n");
  channel.write("data: " + JSON.stringify(req.body));
  channel.write("\n\n");

  res.send(200);
});

// TODO: refactor, this is almost a duplicate of post("offer").
app.post("/answer", function(req, res) {
  if (!req.session.user) {
    res.send(401, "Unauthorized, answer access denied");
    return;
  }

  if (!req.body.to || !req.body.from || !req.body.answer) {
    res.send(400, "Invalid offer request");
    return;
  }

  var channel = users[req.body.to];
  if (!channel) {
    res.send(400, "Invalid user for answer");
    return;
  }

  channel.write("event: answer\n");
  channel.write("data: " + JSON.stringify(req.body));
  channel.write("\n\n");

  res.send(200);
});

app.post("/login", function(req, res) {
  if (!req.body.assertion) {
    res.send(500, "Invalid login request");
    return;
  }

  verifyAssertion(req.body.assertion, audience, function(val) {
    if (val) {
      req.session.regenerate(function() {
        req.session.user = val;
        notifyAllAbout(val);
        res.send(200);
      });
    } else {
      res.send(401, "Invalid Persona assertion");
    }
  });
});

app.post("/logout", function(req, res) {
  req.session.destroy(function(){
    res.send(200);
  });
});

var users = {};
var port = process.env.PORT || 5000;
var audience = process.env.AUDIENCE || "http://gupshup.herokuapp.com";

app.listen(port, function() {
  console.log("Port is " + port + " with audience " + audience);
});

// Helper functions.

function doRedirect(msg, res) {
  res.redirect("/login?err=" + encodeURIComponent(msg));
}

function notifyAllAbout(user) {
  var keys = Object.keys(users);
  for (var i = 0; i < keys.length; i++) {
    var channel = users[keys[i]];
    channel.write("event: userjoined\n");
    channel.write("data: " + user + "\n\n");
  }
}

function verifyAssertion(ast, aud, cb) {
  if (!process.env.ONLINE) {
    cb(ast);
    return;
  }

  var data = "audience=" + encodeURIComponent(aud);
  data += "&assertion=" + encodeURIComponent(ast);

  var options = {
    host: "verifier.login.persona.org",
    path: "/verify",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": data.length
    }
  };

  var req = https.request(options, function(res) {
    var ret = "";
    res.on("data", function(chunk) {
      ret += chunk;
    });
    res.on("end", function() {
      try {
        var val = JSON.parse(ret);
      } catch(e) {
        cb(false);
        return;
      }
      if (val.status == "okay") {
        cb(val.email);
      } else {
        console.log(data);
        console.log(val);
        cb(false);
      }
    });
  });

  req.write(data);
  req.end();
}

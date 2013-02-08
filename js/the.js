var currentState = null;
var currentUser = null;

var firebaseURL = 'https://prioritizeio.firebaseio.com';
var firebase = new Firebase(firebaseURL);
var firebaseAuth = new FirebaseAuthClient(firebase, function(error, user) {
  console.log(error, user);
  currentUser = user;
  console.log(currentState + " - " + currentUser.email);
  var ifSignedIn = {
    'signin': 'create',
    'survey': 'take'
  };

  Object.keys(ifSignedIn).forEach(function(key) {
    if (document.location.hash.indexOf(key) !== -1) {
      document.location.hash = document.location.hash.replace(key, ifSignedIn[key]);
    };
  });
});

function randomSurveyID() {
  var str = "";
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i=0; i < 10; i++) {
    str += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return str;
};

$(document).ready(function() {
  // when get started is clicked
  $(".get_started").click(function(e) {
    e.preventDefault();
    if (currentUser) {
      document.location.hash = "#/create";
    } else {
      document.location.hash = "#/signin";
    }
  });

  // when sign-in is clicked
  $(".signin").click(function(e) {
    e.preventDefault();
    firebaseAuth.login("persona", { rememberMe: true });
  });

  // when the user submits ye' form
  $("section.create form").submit(function(e) {
    e.preventDefault();
  });

  // when an item is added in create view
  $("section.create .add-item").on('click', function() {
    var ta = $(".create form textarea");
    var thing = $("<div/>").text(ta.val());
    $("section.create .items").append(thing);
    ta.val("").focus();
  });

  // when the user clicks on 'complete survey'
  $("section.create .complete_survey").on('click', function(e) {
    e.preventDefault();
    // first, let's generate a JSON blob
    var blob = {
      title: $(".create .title").val() || "untitle survey",
      questions: $.map($(".create .items > div"), function(x) { return $(x).text(); })
    };

    // now generate a random identifier.  collisions never happen.
    var id = randomSurveyID();

    firebase.child(id).set(blob, function(err) {
      if (err) {
        $('<div class="alert alert-error"></div>').text(err).appendTo($(".create > div"));
      } else {
        // we did it!  let's restore the DOM and transition to success
        $(".create .items").empty();
        // update the survey_url
        var url = document.location.origin + "/#/survey/" + id;
        $("a.survey_url").text(url).attr('href', url);

        // go be successful
        document.location.hash = "#/success";
      }
    });
  });
  if (!document.location.hash) document.location.hash = "#/";
});

function renderSurvey(id) {
  console.log("so, you want to render the survey, eh?", id);
  $("section.take_survey").fadeIn(700);
}

function userHasTakenSurvey(surveyId, cb) {
  var r = firebase.child("responses").child(surveyId).child(currentUser.id);
  responseRef.on('value', function(snapshot) {
  });

}

var router = Router({
  '/' : function() {
    $("section.main").fadeIn(700);
  },
  '/signin' : function() {
    $("section.create_noauth").fadeIn(700);
  },
  '/create': function() {
    $("section.create").fadeIn(700);
  },
  '/success': function() {
    $("section.create_success").fadeIn(700);
  },
  '/survey/:surveyId': function(surveyId) {
    // XXX: check if the survey exists
    if (currentUser) document.location.hash = "#/take/" + surveyId;
    else $("section.survey_noauth").fadeIn(700);
  },
  '/take/:surveyId': function(surveyId) {
    if (!currentUser) document.location.hash = "#/survey/" + surveyId;
    else {
      // if this user has taken this survey, then we'll send them to view, otherwise to take/
      var responseRef = firebase.child("responses").child(surveyId).child(currentUser.id);
      responseRef.on('value', function(snapshot) {
        console.log(snapshot.val());
        // user has take this survey
        if (snapshot.val()) document.location.hash = "#/view/" + surveyId;
        // user hasn't taken this survey
        else renderSurvey(surveyId);
      });
    }
  },
  '/view/:surveyId': function(surveyId) {
    console.log("viewing survey", surveyId);
  }
});

router.configure({
  before: function() {
    // what state are we transitioning to
    currentState = document.location.hash.split('/')[1] || 'main';
    console.log("found route:", document.location.hash);

    $([
      "section.main",
      "section.create_noauth",
      "section.create",
      "section.create_success",
      "section.survey_noauth"
    ].join(",")).hide();

  },
  notfound: function() {
    console.warn("MISSING route:", document.location.hash);
    document.location.hash = '#/';
  }
});

router.init();

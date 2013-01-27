function navigate() {
  function hideAll() {
    $("section.main, section.create_noauth, section.create").hide();
  }
  var hash = document.location.hash;
  hideAll();
  if (hash.indexOf("#signin") === 0) {
    $("section.create_noauth").fadeIn(700);
  } else if (hash.indexOf("#create") === 0) {
    $("section.create").fadeIn(700);
  } else {
    $("section.main").fadeIn(700);
  }
}

$(window).on('hashchange', function() {
  navigate();
});

$(document).ready(function() {
  $(".get_started").click(function(e) {
    e.preventDefault();
    document.location.hash = "#signin";
  });
  $(".signin").click(function(e) {
    e.preventDefault();
    document.location.hash = "#create";
  });
  navigate();
});

// for the main-level index, you're gonna need to delete the "../" before the main.css and main.js--><!-- links. Don't need to for any of the other indexes.

"use strict";

var FIREBASE_URL = "https://movieagenda.firebaseio.com";
var fb = new Firebase(FIREBASE_URL);
var movielist;
var API_URL = "http://www.omdbapi.com/?t=";
var $SUBMITBUTTON = $(".submit");
var $TEXTFIELD = $(".textfield");
var $MOVIEINFO = $(".movie-info");
var $MOVIETABLECONTAINER = $(".movie-table-container");
var movie_info_obj;
var poster_url;
var TMDB_API_KEY = "?api_key=3d3efaa01fcce58b6e8758f0f9d9c93d";
var TMDB_SEARCH_URL = "http://api.themoviedb.org/3/search/movie";
var TMDB_POSTER_BASE = "http://image.tmdb.org/t/p/w500";
var TRAILER_API_URL = "http://crossorigin.me/http://api.traileraddict.com/?film=";

fb.onAuth(function (authData) {
  if (!authData && window.location.pathname !== "/movieagenda/login/") {
    window.location.pathname = "movieagenda/login/";
  } else if (authData) {
    // THE BELOW CODE DOES NOT WORK (if at top of code) BECAUSE:
    // if you *are* on the login page and aren't logged in, the program will *still*
    // take you to the saveAuthData function, execute the function, and throw an error when it tries to read
    // the uid of null (authData is null), *halting* execution of the rest of the script.
    // Page is still usable but the submit handler for "login" hasn't been executed/applied, so it'll just
    // do the default action and refresh the page; user still isn't logged in.
    // WILL WORK AT BOTTOM OF CODE BECAUSE:
    // By the time the error is thrown and the script halts, all the handlers have already
    // been applied (this handler would be the last thing executed, after all).
    // BUT IT MAKES MUCH MORE SENSE TO USE THE ABOVE CODE, WHICH PREVENTS THE ERROR IN QUESTION.
    // } else {
    saveAuthData(authData);
  }
  clearLoginForm();
});

if (window.location.pathname === "/movieagenda/table/") {
  $(".crumbs-left").append($("<p>Welcome, " + fb.getAuth().password.email.split("@")[0] + "!</p>"));
  movielist = fb.child("users/" + fb.getAuth().uid + "/movielist");
  // will add to user's table whenever a movie is added to FirebaseDB (occurs within)
  // submit button clickhandler.
  movielist.on("child_added", function (snapshot) {
    addToTable(snapshot.val(), snapshot.key());
  });
  // will remove from user's table whenever something is deleted from FirebaseDB
  // (occurs within delete button clickhandler) as written below:
  movielist.on("child_removed", function (snapshot) {
    $("[data_id='" + snapshot.key() + "']").fadeOut(500, function () {
      $(this).closest("tr").remove();
      if (!$("td").length) {
        $("table").remove();
      }
    });
  });
}

$(".login-page form").submit(function (event) {
  event.preventDefault();
  var email = $(".login-page input[type=\"email\"]").val();
  var password = $(".login-page input[type=\"password\"]").val();

  doLogin(email, password);
});

$(".doLogout").click(function () {
  fb.unauth();
});

$(".doRegister").click(function (event) {
  event.preventDefault();
  var email = $(".login-page input[type=\"email\"]").val();
  var password = $(".login-page input[type=\"password\"]").val();

  fb.createUser({
    email: email,
    password: password
  }, function (err, userData) {
    if (err) {
      alert(err.toString());
    } else {
      doLogin(email, password);
    }
  });
});

$(".reset-password form").submit(function () {
  var email = fb.getAuth().password.email;
  var oldPw = $("#oldpass").val();
  var newPw = $("#newpass").val();

  fb.changePassword({
    email: email,
    oldPassword: oldPw,
    newPassword: newPw
  }, function (err) {
    if (err) {
      alert(err.toString());
    } else {
      fb.unauth();
    }
  });
  event.preventDefault();
});

$(".doResetPassword").click(function () {
  event.preventDefault();
  var email = $(".login-page input[type=\"email\"]").val();

  fb.resetPassword({
    email: email
  }, function (err) {
    if (err) {
      alert(err.toString());
    } else {
      alert("Please check your email for further instructions.");
    }
  });
});

function doLogin(email, password, callback) {
  fb.authWithPassword({
    email: email,
    password: password
  }, function (err, authData) {
    if (err) {
      alert(err.toString());
    } else {
      typeof callback === "function" && callback(authData);
    }
  });
}

function saveAuthData(authData) {
  var ref = fb.child("users/" + authData.uid + "/profile");
  ref.set(authData, postAuthRouting(authData));
}

function postAuthRouting(authData) {
  if (authData && authData.password.isTemporaryPassword && window.location.pathname !== "/movieagenda/resetpassword/") {
    window.location.pathname = "movieagenda/resetpassword/";
  } else if (authData && !authData.password.isTemporaryPassword && window.location.pathname !== "/movieagenda/table/") {
    window.location.pathname = "movieagenda/table/";
  }
}

// 	$.ajax({
//     method: 'PUT',
//     url: `${FIREBASE_URL}/users/${authData.uid}/profile.json?auth=${fb.getAuth().token}`,
//     data: JSON.stringify(authData)
// 	}).done(function() {
// 		if (authData && authData.password.isTemporaryPassword && window.location.pathname !== "/resetpassword/") {
// 			window.location = "/resetpassword";
// 		} else if (authData && !authData.password.isTemporaryPassword && window.location.pathname !== "/table/") {
// 		  window.location = "/table";
// 		}
// 	});
// }

function clearLoginForm() {
  $(".login-page input[type=\"email\"]").val("");
  $(".login-page input[type=\"password\"]").val("");
}

function getSearchParams() {
  var movie_title = $TEXTFIELD.val();
  var search_params = movie_title.split(" ").join("+");
  return search_params;
}

$SUBMITBUTTON.click(function (event) {
  event.preventDefault();
  var tmdb_search_url = TMDB_SEARCH_URL + TMDB_API_KEY + "&query=" + getSearchParams();
  $.get(tmdb_search_url, setPosterUrl, "jsonp");
});

function setPosterUrl(obj) {
  if (obj.total_results === 0) {
    $MOVIEINFO.empty();
    $MOVIEINFO.append(makeError());
    setTimeout(function () {
      $(".error").fadeOut(500, function () {
        $(".error").remove();
      });
    }, 3000);
    return false;
  }
  var poster_path = obj.results && obj.results[0] && obj.results[0].poster_path;
  poster_url = TMDB_POSTER_BASE + poster_path + TMDB_API_KEY;
  // have the poster url; now get the rest of the data according to the title as it was return by the
  // object bearing the poster path (to keep consistency between both APIs' search results).
  var request_url = API_URL + (obj.results && obj.results[0] && obj.results[0].original_title.split(" ").join("+"));
  $.get(request_url, addMovieInfo, "jsonp");
}

$MOVIEINFO.on("click", ".add-button", function (event) {
  event.preventDefault();
  writeToFirebase(movie_info_obj);
});

$MOVIETABLECONTAINER.on("click", "button.watched-btn", function (event) {
  event.preventDefault();
  deleteFromFirebase($(this).closest("tr").attr("data_id"));
  // $(this).closest('tr').fadeOut(500, function() {
  //   $(this).closest('tr').remove();
  //   if (!($('td').length)) {
  //     $('table').remove();
  //   }
  // });
});

$(".movie-info, .movie-table-container").on("click", "button.trailer-btn", function (event) {
  event.preventDefault();
  var query = $(this).attr("query");
  $.get(TRAILER_API_URL + query + "&count=10", function (dataXML) {
    var $embeds = $(dataXML).find("embed");
    var vid_arr = $.map($embeds, function (embed) {
      return $(embed).text();
    });
    $.fancybox(vid_arr);
  });
});

$MOVIETABLECONTAINER.on("click", "img", function (event) {
  event.preventDefault();
  var id = $(this).closest("tr").attr("data_id");
  movielist.child(id).once("value", function (obj) {
    reClick(obj.val());
  });
});

// reClick is for reloading stored movies into the movie info view; don't need to rewrite the poster url.
function reClick(obj) {
  movie_info_obj = obj;
  $MOVIEINFO.empty();
  $MOVIEINFO.append(makeMovieInfo(obj));
}

function addMovieInfo(obj) {
  movie_info_obj = obj;
  movie_info_obj.Poster = poster_url;
  $MOVIEINFO.empty();
  $MOVIEINFO.append(makeMovieInfo(obj));
}

function makeError() {
  var $error = $("<div><p>(´Ａ｀。) No results!</p></div>");
  $error.addClass("error");
  return $error;
}

function makeMovieInfo(obj) {
  var $info_container = $("<div></div>");
  $info_container.addClass("info-container");
  var $title = $("<p>" + obj.Title + "</p>");
  var $info = $(makeRatingImgText(obj) + "<button class='trailer-btn btn btn-sm btn-default' query='" + obj.Title.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(" ").join("-") + "'>View clips</button><span " + makeMetaRatingText(obj) + "</span><p class='imdb-rating'>" + obj.imdbRating + "</p></span><span>&nbsp" + obj.Year + "</span><span>&nbsp&nbsp&nbsp" + obj.Runtime + "</span>");
  $title.addClass("title");
  var $director = $("<p>Director: " + obj.Director + "</p>");
  var $plot = $("<p>" + obj.Plot + "</p>");
  var $add_button = $("<button>Add to my list</button>");
  $add_button.addClass("add-button btn btn-lg btn-success pull-right");

  var $poster = $("<img src='" + obj.Poster + "'></img>");
  $poster.addClass("pull-left");
  $info_container.append($poster);
  $info_container.append($title).append($info).append($director).append($plot).append($add_button);
  return $info_container;
}

function addToTable(obj, id) {
  if (!$("table").length) {
    $MOVIETABLECONTAINER.append(makeTableHeader());
  }
  $("table").append(makeTableRow(obj, id));
}

function makeTableHeader() {
  var $table = $("<table></table>");
  $table.addClass("table table-striped");
  var $header_row = $("<tr></tr>");
  var $header_elements = $("<th></th><th>Title</th><th>Year</th><th>Rating</th><th>Clips</th><th>Metascore</th><th>imdb</th><th></th>");
  $header_row.append($header_elements);
  $table.append($header_row);
  return $table;
}

function makeTableRow(obj, id) {
  var $row = $("<tr></tr>");
  var $poster_td;
  $row.attr("data_id", id || obj.data_id);
  obj.Poster === "N/A" ? $poster_td = $("<td><img src='" + "https://www.utopolis.lu/bundles/utopoliscommon/images/movies/movie-placeholder.jpg" + "'></td>") : $poster_td = $("<td><img src='" + obj.Poster + "'></src>");
  var other_rows = "<td>" + obj.Title + "</td><td>" + obj.Year + "</td><td>";
  other_rows += makeRatingImgText(obj);
  other_rows += "</td>";
  other_rows += "<td><button class='trailer-btn' query='" + obj.Title.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(" ").join("-") + "'>View</button>";
  other_rows += "<td><p " + makeMetaRatingText(obj) + "</p></td>";
  other_rows += "<td><p class='imdb-rating'>" + obj.imdbRating + "</p></td>";
  other_rows += "<td><button class='watched-btn'>Watched</button></td>";
  var $other_rows = $(other_rows);
  $other_rows.find("button.watched-btn").addClass("btn btn-md btn-danger");
  $other_rows.find("button.trailer-btn").addClass("btn btn-md btn-default");
  $row.append($poster_td).append($other_rows);
  return $row;
}

function makeMetaRatingText(obj) {
  var return_str = "class='metascore ";
  if (parseInt(obj.Metascore) > 60) {
    return_str += "meta-positive";
  } else if (parseInt(obj.Metascore) > 39) {
    return_str += "meta-neutral";
  } else if (parseInt(obj.Metascore) >= 0) {
    return_str += "meta-negative";
  }
  return_str += "'>" + obj.Metascore;
  return return_str;
}

function makeRatingImgText(obj) {
  if (obj.Rated === "G") {
    return "<img class='rating-img' src='../images/G.svg'>";
  } else if (obj.Rated === "PG") {
    return "<img class='rating-img' src='../images/PG.svg'>";
  } else if (obj.Rated === "PG-13") {
    return "<img class='rating-img' src='../images/PG-13.svg'>";
  } else if (obj.Rated === "R") {
    return "<img class='rating-img' src='../images/R.svg'>";
  } else if (obj.Rated === "NC-17") {
    return "<img class='rating-img' src='../images/NC-17.svg'>";
  } else {
    return "<span>N/A</span>";
  }
}

function writeToFirebase(obj) {
  var newPush = movielist.push(obj);
  obj.data_id = newPush.key();

  //$.post(`${FIREBASE_URL}/users/${fb.getAuth().uid}/movielist.json?auth=${fb.getAuth().token}`, JSON.stringify(obj), function(response) {
  //  obj.data_id = response.name;
  //})
}

function deleteFromFirebase(id) {
  movielist.child(id).set(null);

  // var deleteUrl = `${FIREBASE_URL}/users/${fb.getAuth().uid}/movielist/${id}.json?auth=${fb.getAuth().token}`;
  // $.ajax({url: deleteUrl, type: 'DELETE'});
}

//function tableLoad() {
//  $.get(`${FIREBASE_URL}/users/${fb.getAuth().uid}/movielist.json?auth=${fb.getAuth().token}`, function(db_data) {
//    db_data && _(db_data).forEach(function(value, key) {
//      addToTable(value, key);
//    }).value();
//  })
//}
//   var token = fb.getAuth().token;
//   $.get(`${FIREBASE_URL}/users/${fb.getAuth().uid}/movielist/${id}.json?auth=${token}`, reClick, "jsonp");
//# sourceMappingURL=data:application/json;base64,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QU8sR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2xDLEtBQUcsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDOzs7OztDQUs3Qjs7QUFFRCxTQUFTLGtCQUFrQixDQUFDLEVBQUUsRUFBRTtBQUM5QixXQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQzs7OztDQUkvQjs7Ozs7Ozs7O0FBQUEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGZvciB0aGUgbWFpbi1sZXZlbCBpbmRleCwgeW91J3JlIGdvbm5hIG5lZWQgdG8gZGVsZXRlIHRoZSBcIi4uL1wiIGJlZm9yZSB0aGUgbWFpbi5jc3MgYW5kIG1haW4uanMtLT48IS0tIGxpbmtzLiBEb24ndCBuZWVkIHRvIGZvciBhbnkgb2YgdGhlIG90aGVyIGluZGV4ZXMuXG5cbnZhciBGSVJFQkFTRV9VUkwgPSBcImh0dHBzOi8vbW92aWVhZ2VuZGEuZmlyZWJhc2Vpby5jb21cIjtcbnZhciBmYiA9IG5ldyBGaXJlYmFzZShGSVJFQkFTRV9VUkwpO1xudmFyIG1vdmllbGlzdDtcbnZhciBBUElfVVJMID0gXCJodHRwOi8vd3d3Lm9tZGJhcGkuY29tLz90PVwiO1xudmFyICRTVUJNSVRCVVRUT04gPSAkKFwiLnN1Ym1pdFwiKTtcbnZhciAkVEVYVEZJRUxEID0gJChcIi50ZXh0ZmllbGRcIik7XG52YXIgJE1PVklFSU5GTyA9ICQoXCIubW92aWUtaW5mb1wiKTtcbnZhciAkTU9WSUVUQUJMRUNPTlRBSU5FUiA9ICQoXCIubW92aWUtdGFibGUtY29udGFpbmVyXCIpO1xudmFyIG1vdmllX2luZm9fb2JqO1xudmFyIHBvc3Rlcl91cmw7XG52YXIgVE1EQl9BUElfS0VZID0gXCI/YXBpX2tleT0zZDNlZmFhMDFmY2NlNThiNmU4NzU4ZjBmOWQ5YzkzZFwiO1xudmFyIFRNREJfU0VBUkNIX1VSTCA9IFwiaHR0cDovL2FwaS50aGVtb3ZpZWRiLm9yZy8zL3NlYXJjaC9tb3ZpZVwiO1xudmFyIFRNREJfUE9TVEVSX0JBU0UgPSBcImh0dHA6Ly9pbWFnZS50bWRiLm9yZy90L3AvdzUwMFwiO1xudmFyIFRSQUlMRVJfQVBJX1VSTCA9IFwiaHR0cDovL2Nyb3Nzb3JpZ2luLm1lL2h0dHA6Ly9hcGkudHJhaWxlcmFkZGljdC5jb20vP2ZpbG09XCI7XG5cbmZiLm9uQXV0aChmdW5jdGlvbihhdXRoRGF0YSkge1xuICBpZiAoIWF1dGhEYXRhICYmIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSAhPT0gXCIvbW92aWVhZ2VuZGEvbG9naW4vXCIpe1xuXHQgIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSA9IFwibW92aWVhZ2VuZGEvbG9naW4vXCI7XG4gIH0gZWxzZSBpZiAoYXV0aERhdGEpIHtcbi8vIFRIRSBCRUxPVyBDT0RFIERPRVMgTk9UIFdPUksgKGlmIGF0IHRvcCBvZiBjb2RlKSBCRUNBVVNFOlxuLy8gaWYgeW91ICphcmUqIG9uIHRoZSBsb2dpbiBwYWdlIGFuZCBhcmVuJ3QgbG9nZ2VkIGluLCB0aGUgcHJvZ3JhbSB3aWxsICpzdGlsbCpcbi8vIHRha2UgeW91IHRvIHRoZSBzYXZlQXV0aERhdGEgZnVuY3Rpb24sIGV4ZWN1dGUgdGhlIGZ1bmN0aW9uLCBhbmQgdGhyb3cgYW4gZXJyb3Igd2hlbiBpdCB0cmllcyB0byByZWFkXG4vLyB0aGUgdWlkIG9mIG51bGwgKGF1dGhEYXRhIGlzIG51bGwpLCAqaGFsdGluZyogZXhlY3V0aW9uIG9mIHRoZSByZXN0IG9mIHRoZSBzY3JpcHQuXG4vLyBQYWdlIGlzIHN0aWxsIHVzYWJsZSBidXQgdGhlIHN1Ym1pdCBoYW5kbGVyIGZvciBcImxvZ2luXCIgaGFzbid0IGJlZW4gZXhlY3V0ZWQvYXBwbGllZCwgc28gaXQnbGwganVzdFxuLy8gZG8gdGhlIGRlZmF1bHQgYWN0aW9uIGFuZCByZWZyZXNoIHRoZSBwYWdlOyB1c2VyIHN0aWxsIGlzbid0IGxvZ2dlZCBpbi5cbi8vIFdJTEwgV09SSyBBVCBCT1RUT00gT0YgQ09ERSBCRUNBVVNFOlxuLy8gQnkgdGhlIHRpbWUgdGhlIGVycm9yIGlzIHRocm93biBhbmQgdGhlIHNjcmlwdCBoYWx0cywgYWxsIHRoZSBoYW5kbGVycyBoYXZlIGFscmVhZHlcbi8vIGJlZW4gYXBwbGllZCAodGhpcyBoYW5kbGVyIHdvdWxkIGJlIHRoZSBsYXN0IHRoaW5nIGV4ZWN1dGVkLCBhZnRlciBhbGwpLlxuLy8gQlVUIElUIE1BS0VTIE1VQ0ggTU9SRSBTRU5TRSBUTyBVU0UgVEhFIEFCT1ZFIENPREUsIFdISUNIIFBSRVZFTlRTIFRIRSBFUlJPUiBJTiBRVUVTVElPTi5cbi8vIH0gZWxzZSB7XG5cdFx0c2F2ZUF1dGhEYXRhKGF1dGhEYXRhKTtcblx0fVxuXHRjbGVhckxvZ2luRm9ybSgpO1xufSk7XG5cbmlmICh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgPT09IFwiL21vdmllYWdlbmRhL3RhYmxlL1wiKSB7XG5cdCQoJy5jcnVtYnMtbGVmdCcpLmFwcGVuZCgkKGA8cD5XZWxjb21lLCAke2ZiLmdldEF1dGgoKS5wYXNzd29yZC5lbWFpbC5zcGxpdChcIkBcIilbMF19ITwvcD5gKSlcbiAgbW92aWVsaXN0ID0gZmIuY2hpbGQoYHVzZXJzLyR7ZmIuZ2V0QXV0aCgpLnVpZH0vbW92aWVsaXN0YCk7XG4gIC8vIHdpbGwgYWRkIHRvIHVzZXIncyB0YWJsZSB3aGVuZXZlciBhIG1vdmllIGlzIGFkZGVkIHRvIEZpcmViYXNlREIgKG9jY3VycyB3aXRoaW4pXG4gIC8vIHN1Ym1pdCBidXR0b24gY2xpY2toYW5kbGVyLlxuICBtb3ZpZWxpc3Qub24oJ2NoaWxkX2FkZGVkJywgZnVuY3Rpb24oc25hcHNob3QpIHtcbiAgICBhZGRUb1RhYmxlKHNuYXBzaG90LnZhbCgpLCBzbmFwc2hvdC5rZXkoKSk7XG4gIH0pO1xuICAvLyB3aWxsIHJlbW92ZSBmcm9tIHVzZXIncyB0YWJsZSB3aGVuZXZlciBzb21ldGhpbmcgaXMgZGVsZXRlZCBmcm9tIEZpcmViYXNlREJcbiAgLy8gKG9jY3VycyB3aXRoaW4gZGVsZXRlIGJ1dHRvbiBjbGlja2hhbmRsZXIpIGFzIHdyaXR0ZW4gYmVsb3c6XG4gIG1vdmllbGlzdC5vbignY2hpbGRfcmVtb3ZlZCcsIGZ1bmN0aW9uKHNuYXBzaG90KSB7XG4gICAgJChcIltkYXRhX2lkPSdcIiArIHNuYXBzaG90LmtleSgpICsgXCInXVwiKS5mYWRlT3V0KDUwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XG4gICAgICAgIGlmICghKCQoJ3RkJykubGVuZ3RoKSkge1xuICAgICAgICAgICQoJ3RhYmxlJykucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbiQoJy5sb2dpbi1wYWdlIGZvcm0nKS5zdWJtaXQoZnVuY3Rpb24oZXZlbnQpIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0dmFyIGVtYWlsID0gJCgnLmxvZ2luLXBhZ2UgaW5wdXRbdHlwZT1cImVtYWlsXCJdJykudmFsKCk7XG5cdHZhciBwYXNzd29yZCA9ICQoJy5sb2dpbi1wYWdlIGlucHV0W3R5cGU9XCJwYXNzd29yZFwiXScpLnZhbCgpO1xuXG5cdGRvTG9naW4oZW1haWwsIHBhc3N3b3JkKTtcbn0pO1xuXG4kKCcuZG9Mb2dvdXQnKS5jbGljayhmdW5jdGlvbigpIHtcblx0ZmIudW5hdXRoKCk7XG59KVxuXG4kKCcuZG9SZWdpc3RlcicpLmNsaWNrKGZ1bmN0aW9uKGV2ZW50KSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdHZhciBlbWFpbCA9ICQoJy5sb2dpbi1wYWdlIGlucHV0W3R5cGU9XCJlbWFpbFwiXScpLnZhbCgpO1xuXHR2YXIgcGFzc3dvcmQgPSAkKCcubG9naW4tcGFnZSBpbnB1dFt0eXBlPVwicGFzc3dvcmRcIl0nKS52YWwoKTtcblxuXHRmYi5jcmVhdGVVc2VyKHtcblx0XHRlbWFpbDogZW1haWwsXG5cdFx0cGFzc3dvcmQ6IHBhc3N3b3JkXG5cdH0sIGZ1bmN0aW9uKGVyciwgdXNlckRhdGEpIHtcblx0XHRpZiAoZXJyKSB7XG5cdFx0XHRhbGVydChlcnIudG9TdHJpbmcoKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGRvTG9naW4oZW1haWwsIHBhc3N3b3JkKTtcblx0XHR9XG5cdH0pO1xufSlcblxuJCgnLnJlc2V0LXBhc3N3b3JkIGZvcm0nKS5zdWJtaXQoZnVuY3Rpb24oKSB7XG5cdHZhciBlbWFpbCA9IGZiLmdldEF1dGgoKS5wYXNzd29yZC5lbWFpbDtcblx0dmFyIG9sZFB3ID0gJCgnI29sZHBhc3MnKS52YWwoKTtcblx0dmFyIG5ld1B3ID0gJCgnI25ld3Bhc3MnKS52YWwoKTtcblxuXHRmYi5jaGFuZ2VQYXNzd29yZCh7XG5cdFx0ZW1haWw6IGVtYWlsLFxuXHRcdG9sZFBhc3N3b3JkOiBvbGRQdyxcblx0XHRuZXdQYXNzd29yZDogbmV3UHdcblx0fSwgZnVuY3Rpb24oZXJyKSB7XG5cdFx0aWYgKGVycikge1xuXHRcdFx0YWxlcnQoZXJyLnRvU3RyaW5nKCkpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRmYi51bmF1dGgoKTtcblx0XHR9XG5cdH0pO1xuXHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xufSk7XG5cbiQoJy5kb1Jlc2V0UGFzc3dvcmQnKS5jbGljayhmdW5jdGlvbigpIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0dmFyIGVtYWlsID0gJCgnLmxvZ2luLXBhZ2UgaW5wdXRbdHlwZT1cImVtYWlsXCJdJykudmFsKCk7XG5cblx0ZmIucmVzZXRQYXNzd29yZCh7XG5cdFx0ZW1haWw6IGVtYWlsXG5cdH0sIGZ1bmN0aW9uKGVycikge1xuXHRcdGlmIChlcnIpIHtcblx0XHRcdGFsZXJ0KGVyci50b1N0cmluZygpKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0YWxlcnQoXCJQbGVhc2UgY2hlY2sgeW91ciBlbWFpbCBmb3IgZnVydGhlciBpbnN0cnVjdGlvbnMuXCIpO1xuXHRcdH1cblx0fSk7XG59KTtcblxuZnVuY3Rpb24gZG9Mb2dpbihlbWFpbCwgcGFzc3dvcmQsIGNhbGxiYWNrKSB7XG5cdGZiLmF1dGhXaXRoUGFzc3dvcmQoe1xuXHRcdGVtYWlsOiBlbWFpbCxcblx0XHRwYXNzd29yZDogcGFzc3dvcmRcblx0fSwgZnVuY3Rpb24oZXJyLCBhdXRoRGF0YSl7XG5cdFx0aWYgKGVycikge1xuXHRcdFx0YWxlcnQoZXJyLnRvU3RyaW5nKCkpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicgJiYgY2FsbGJhY2soYXV0aERhdGEpO1xuXHRcdH1cblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNhdmVBdXRoRGF0YSAoYXV0aERhdGEpIHtcblx0dmFyIHJlZiA9IGZiLmNoaWxkKGB1c2Vycy8ke2F1dGhEYXRhLnVpZH0vcHJvZmlsZWApO1xuXHRyZWYuc2V0KGF1dGhEYXRhLCBwb3N0QXV0aFJvdXRpbmcoYXV0aERhdGEpKTtcbn1cblxuZnVuY3Rpb24gcG9zdEF1dGhSb3V0aW5nKGF1dGhEYXRhKSB7XG5cdGlmIChhdXRoRGF0YSAmJiBhdXRoRGF0YS5wYXNzd29yZC5pc1RlbXBvcmFyeVBhc3N3b3JkICYmIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSAhPT0gXCIvbW92aWVhZ2VuZGEvcmVzZXRwYXNzd29yZC9cIikge1xuXHRcdFx0d2luZG93LmxvY2F0aW9uLnBhdGhuYW1lID0gXCJtb3ZpZWFnZW5kYS9yZXNldHBhc3N3b3JkL1wiO1xuXHRcdH0gZWxzZSBpZiAoYXV0aERhdGEgJiYgIWF1dGhEYXRhLnBhc3N3b3JkLmlzVGVtcG9yYXJ5UGFzc3dvcmQgJiYgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lICE9PSBcIi9tb3ZpZWFnZW5kYS90YWJsZS9cIikge1xuXHRcdCAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lID0gXCJtb3ZpZWFnZW5kYS90YWJsZS9cIjtcblx0XHR9XG59XG5cbi8vIFx0JC5hamF4KHtcbi8vICAgICBtZXRob2Q6ICdQVVQnLFxuLy8gICAgIHVybDogYCR7RklSRUJBU0VfVVJMfS91c2Vycy8ke2F1dGhEYXRhLnVpZH0vcHJvZmlsZS5qc29uP2F1dGg9JHtmYi5nZXRBdXRoKCkudG9rZW59YCxcbi8vICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShhdXRoRGF0YSlcbi8vIFx0fSkuZG9uZShmdW5jdGlvbigpIHtcbi8vIFx0XHRpZiAoYXV0aERhdGEgJiYgYXV0aERhdGEucGFzc3dvcmQuaXNUZW1wb3JhcnlQYXNzd29yZCAmJiB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgIT09IFwiL3Jlc2V0cGFzc3dvcmQvXCIpIHtcbi8vIFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IFwiL3Jlc2V0cGFzc3dvcmRcIjtcbi8vIFx0XHR9IGVsc2UgaWYgKGF1dGhEYXRhICYmICFhdXRoRGF0YS5wYXNzd29yZC5pc1RlbXBvcmFyeVBhc3N3b3JkICYmIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSAhPT0gXCIvdGFibGUvXCIpIHtcbi8vIFx0XHQgIHdpbmRvdy5sb2NhdGlvbiA9IFwiL3RhYmxlXCI7XG4vLyBcdFx0fVxuLy8gXHR9KTtcbi8vIH1cblxuZnVuY3Rpb24gY2xlYXJMb2dpbkZvcm0oKSB7XG5cdCQoJy5sb2dpbi1wYWdlIGlucHV0W3R5cGU9XCJlbWFpbFwiXScpLnZhbCgnJyk7XG5cdCQoJy5sb2dpbi1wYWdlIGlucHV0W3R5cGU9XCJwYXNzd29yZFwiXScpLnZhbCgnJyk7XG59XG5cbmZ1bmN0aW9uIGdldFNlYXJjaFBhcmFtcygpIHtcbiAgdmFyIG1vdmllX3RpdGxlID0gJFRFWFRGSUVMRC52YWwoKTtcbiAgdmFyIHNlYXJjaF9wYXJhbXMgPSBtb3ZpZV90aXRsZS5zcGxpdChcIiBcIikuam9pbihcIitcIik7XG4gIHJldHVybiBzZWFyY2hfcGFyYW1zO1xufVxuXG4kU1VCTUlUQlVUVE9OLmNsaWNrKGZ1bmN0aW9uKGV2ZW50KSB7XG4gIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gIHZhciB0bWRiX3NlYXJjaF91cmwgPSBUTURCX1NFQVJDSF9VUkwgKyBUTURCX0FQSV9LRVkgKyBcIiZxdWVyeT1cIiArIGdldFNlYXJjaFBhcmFtcygpO1xuICAkLmdldCh0bWRiX3NlYXJjaF91cmwsIHNldFBvc3RlclVybCwgJ2pzb25wJyk7XG59KVxuXG5mdW5jdGlvbiBzZXRQb3N0ZXJVcmwob2JqKSB7XG4gIGlmIChvYmoudG90YWxfcmVzdWx0cyA9PT0gMCkge1xuICAgICRNT1ZJRUlORk8uZW1wdHkoKTtcbiAgICAkTU9WSUVJTkZPLmFwcGVuZChtYWtlRXJyb3IoKSk7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICQoXCIuZXJyb3JcIikuZmFkZU91dCg1MDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAkKFwiLmVycm9yXCIpLnJlbW92ZSgpO1xuICAgICAgfSlcbiAgICB9LCAzMDAwKVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2YXIgcG9zdGVyX3BhdGggPSBvYmoucmVzdWx0cyAmJiBvYmoucmVzdWx0c1swXSAmJiBvYmoucmVzdWx0c1swXS5wb3N0ZXJfcGF0aDtcbiAgcG9zdGVyX3VybCA9IFRNREJfUE9TVEVSX0JBU0UgKyBwb3N0ZXJfcGF0aCArIFRNREJfQVBJX0tFWTtcbiAgLy8gaGF2ZSB0aGUgcG9zdGVyIHVybDsgbm93IGdldCB0aGUgcmVzdCBvZiB0aGUgZGF0YSBhY2NvcmRpbmcgdG8gdGhlIHRpdGxlIGFzIGl0IHdhcyByZXR1cm4gYnkgdGhlXG4gIC8vIG9iamVjdCBiZWFyaW5nIHRoZSBwb3N0ZXIgcGF0aCAodG8ga2VlcCBjb25zaXN0ZW5jeSBiZXR3ZWVuIGJvdGggQVBJcycgc2VhcmNoIHJlc3VsdHMpLlxuICB2YXIgcmVxdWVzdF91cmwgPSBBUElfVVJMICsgKG9iai5yZXN1bHRzICYmIG9iai5yZXN1bHRzWzBdICYmIG9iai5yZXN1bHRzWzBdLm9yaWdpbmFsX3RpdGxlLnNwbGl0KFwiIFwiKS5qb2luKFwiK1wiKSk7XG4gICQuZ2V0KHJlcXVlc3RfdXJsLCBhZGRNb3ZpZUluZm8sICdqc29ucCcpO1xufVxuXG4kTU9WSUVJTkZPLm9uKCdjbGljaycsICcuYWRkLWJ1dHRvbicsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gIHdyaXRlVG9GaXJlYmFzZShtb3ZpZV9pbmZvX29iaik7XG59KVxuXG4kTU9WSUVUQUJMRUNPTlRBSU5FUi5vbignY2xpY2snLCAnYnV0dG9uLndhdGNoZWQtYnRuJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgZGVsZXRlRnJvbUZpcmViYXNlKCQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhX2lkJykpO1xuICAvLyAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuZmFkZU91dCg1MDAsIGZ1bmN0aW9uKCkge1xuICAvLyAgICQodGhpcykuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgLy8gICBpZiAoISgkKCd0ZCcpLmxlbmd0aCkpIHtcbiAgLy8gICAgICQoJ3RhYmxlJykucmVtb3ZlKCk7XG4gIC8vICAgfVxuICAvLyB9KTtcbn0pXG5cbiQoXCIubW92aWUtaW5mbywgLm1vdmllLXRhYmxlLWNvbnRhaW5lclwiKS5vbihcImNsaWNrXCIsIFwiYnV0dG9uLnRyYWlsZXItYnRuXCIsIGZ1bmN0aW9uIChldmVudCkge1xuICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICB2YXIgcXVlcnkgPSAkKHRoaXMpLmF0dHIoXCJxdWVyeVwiKTtcbiAgJC5nZXQoVFJBSUxFUl9BUElfVVJMICsgcXVlcnkgKyBcIiZjb3VudD0xMFwiLCBmdW5jdGlvbiAoZGF0YVhNTCkge1xuICAgIHZhciAkZW1iZWRzID0gJChkYXRhWE1MKS5maW5kKFwiZW1iZWRcIik7XG4gICAgdmFyIHZpZF9hcnIgPSAkLm1hcCgkZW1iZWRzLCBmdW5jdGlvbiAoZW1iZWQpIHtcbiAgICAgIHJldHVybiAkKGVtYmVkKS50ZXh0KCk7XG4gICAgfSk7XG4gICAgJC5mYW5jeWJveCh2aWRfYXJyKTtcbiAgfSk7XG59KTtcblxuJE1PVklFVEFCTEVDT05UQUlORVIub24oJ2NsaWNrJywgJ2ltZycsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gIHZhciBpZCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhX2lkJyk7XG4gIG1vdmllbGlzdC5jaGlsZChpZCkub25jZShcInZhbHVlXCIsIGZ1bmN0aW9uKG9iaikge1xuICBcdHJlQ2xpY2sob2JqLnZhbCgpKTtcbiAgfSlcbi8vICAgdmFyIHRva2VuID0gZmIuZ2V0QXV0aCgpLnRva2VuO1xuLy8gICAkLmdldChgJHtGSVJFQkFTRV9VUkx9L3VzZXJzLyR7ZmIuZ2V0QXV0aCgpLnVpZH0vbW92aWVsaXN0LyR7aWR9Lmpzb24/YXV0aD0ke3Rva2VufWAsIHJlQ2xpY2ssIFwianNvbnBcIik7XG59KVxuXG4vLyByZUNsaWNrIGlzIGZvciByZWxvYWRpbmcgc3RvcmVkIG1vdmllcyBpbnRvIHRoZSBtb3ZpZSBpbmZvIHZpZXc7IGRvbid0IG5lZWQgdG8gcmV3cml0ZSB0aGUgcG9zdGVyIHVybC5cbmZ1bmN0aW9uIHJlQ2xpY2sob2JqKSB7XG4gIG1vdmllX2luZm9fb2JqID0gb2JqO1xuICAkTU9WSUVJTkZPLmVtcHR5KCk7XG4gICRNT1ZJRUlORk8uYXBwZW5kKG1ha2VNb3ZpZUluZm8ob2JqKSk7XG59XG5cbmZ1bmN0aW9uIGFkZE1vdmllSW5mbyhvYmopIHtcbiAgbW92aWVfaW5mb19vYmogPSBvYmo7XG4gIG1vdmllX2luZm9fb2JqLlBvc3RlciA9IHBvc3Rlcl91cmw7XG4gICRNT1ZJRUlORk8uZW1wdHkoKTtcbiAgJE1PVklFSU5GTy5hcHBlbmQobWFrZU1vdmllSW5mbyhvYmopKTtcbn1cblxuZnVuY3Rpb24gbWFrZUVycm9yKCkge1xuICB2YXIgJGVycm9yID0gJCgnPGRpdj48cD4owrTvvKHvvYDjgIIpIE5vIHJlc3VsdHMhPC9wPjwvZGl2PicpXG4gICRlcnJvci5hZGRDbGFzcyhcImVycm9yXCIpO1xuICByZXR1cm4gJGVycm9yO1xufVxuXG5mdW5jdGlvbiBtYWtlTW92aWVJbmZvKG9iaikge1xuICB2YXIgJGluZm9fY29udGFpbmVyID0gJCgnPGRpdj48L2Rpdj4nKTtcbiAgJGluZm9fY29udGFpbmVyLmFkZENsYXNzKFwiaW5mby1jb250YWluZXJcIik7XG4gIHZhciAkdGl0bGUgPSAkKFwiPHA+XCIgKyBvYmouVGl0bGUgKyBcIjwvcD5cIik7XG4gIHZhciAkaW5mbyA9ICQobWFrZVJhdGluZ0ltZ1RleHQob2JqKSArIFwiPGJ1dHRvbiBjbGFzcz0ndHJhaWxlci1idG4gYnRuIGJ0bi1zbSBidG4tZGVmYXVsdCcgcXVlcnk9J1wiICsgb2JqLlRpdGxlLnJlcGxhY2UoL1tcXC4sLVxcLyMhJCVcXF4mXFwqOzp7fT1cXC1fYH4oKV0vZyxcIlwiKS5zcGxpdChcIiBcIikuam9pbihcIi1cIikgKyBcIic+VmlldyBjbGlwczwvYnV0dG9uPjxzcGFuIFwiICsgbWFrZU1ldGFSYXRpbmdUZXh0KG9iaikgKyBcIjwvc3Bhbj48cCBjbGFzcz0naW1kYi1yYXRpbmcnPlwiICsgb2JqLmltZGJSYXRpbmcgKyBcIjwvcD48L3NwYW4+PHNwYW4+Jm5ic3BcIiArIG9iai5ZZWFyICsgXCI8L3NwYW4+PHNwYW4+Jm5ic3AmbmJzcCZuYnNwXCIgKyBvYmouUnVudGltZSArIFwiPC9zcGFuPlwiKTtcbiAgJHRpdGxlLmFkZENsYXNzKFwidGl0bGVcIik7XG4gIHZhciAkZGlyZWN0b3IgPSAkKFwiPHA+RGlyZWN0b3I6IFwiICsgb2JqLkRpcmVjdG9yICsgXCI8L3A+XCIpO1xuICB2YXIgJHBsb3QgPSAkKFwiPHA+XCIgKyBvYmouUGxvdCArIFwiPC9wPlwiKTtcbiAgdmFyICRhZGRfYnV0dG9uID0gJChcIjxidXR0b24+QWRkIHRvIG15IGxpc3Q8L2J1dHRvbj5cIik7XG4gICRhZGRfYnV0dG9uLmFkZENsYXNzKFwiYWRkLWJ1dHRvbiBidG4gYnRuLWxnIGJ0bi1zdWNjZXNzIHB1bGwtcmlnaHRcIik7XG5cbiAgdmFyICRwb3N0ZXIgPSAkKFwiPGltZyBzcmM9J1wiICsgb2JqLlBvc3RlciArIFwiJz48L2ltZz5cIik7XG4gICRwb3N0ZXIuYWRkQ2xhc3MoXCJwdWxsLWxlZnRcIik7XG4gICRpbmZvX2NvbnRhaW5lci5hcHBlbmQoJHBvc3Rlcik7XG4gICRpbmZvX2NvbnRhaW5lci5hcHBlbmQoJHRpdGxlKS5hcHBlbmQoJGluZm8pLmFwcGVuZCgkZGlyZWN0b3IpLmFwcGVuZCgkcGxvdCkuYXBwZW5kKCRhZGRfYnV0dG9uKTtcbiAgcmV0dXJuICRpbmZvX2NvbnRhaW5lcjtcbn1cblxuZnVuY3Rpb24gYWRkVG9UYWJsZShvYmosIGlkKSB7XG4gIGlmICghKCQoXCJ0YWJsZVwiKS5sZW5ndGgpKSB7XG4gICAgJE1PVklFVEFCTEVDT05UQUlORVIuYXBwZW5kKG1ha2VUYWJsZUhlYWRlcigpKTtcbiAgfVxuICAkKFwidGFibGVcIikuYXBwZW5kKG1ha2VUYWJsZVJvdyhvYmosIGlkKSk7XG59XG5cbmZ1bmN0aW9uIG1ha2VUYWJsZUhlYWRlcigpIHtcbiAgdmFyICR0YWJsZT0gJChcIjx0YWJsZT48L3RhYmxlPlwiKTtcbiAgJHRhYmxlLmFkZENsYXNzKFwidGFibGUgdGFibGUtc3RyaXBlZFwiKTtcbiAgdmFyICRoZWFkZXJfcm93ID0gJChcIjx0cj48L3RyPlwiKTtcbiAgdmFyICRoZWFkZXJfZWxlbWVudHMgPSAkKFwiPHRoPjwvdGg+PHRoPlRpdGxlPC90aD48dGg+WWVhcjwvdGg+PHRoPlJhdGluZzwvdGg+PHRoPkNsaXBzPC90aD48dGg+TWV0YXNjb3JlPC90aD48dGg+aW1kYjwvdGg+PHRoPjwvdGg+XCIpO1xuICAkaGVhZGVyX3Jvdy5hcHBlbmQoJGhlYWRlcl9lbGVtZW50cyk7XG4gICR0YWJsZS5hcHBlbmQoJGhlYWRlcl9yb3cpO1xuICByZXR1cm4gJHRhYmxlO1xufVxuXG5mdW5jdGlvbiBtYWtlVGFibGVSb3cob2JqLCBpZCkge1xuICB2YXIgJHJvdyA9ICQoXCI8dHI+PC90cj5cIik7XG4gIHZhciAkcG9zdGVyX3RkO1xuICAkcm93LmF0dHIoXCJkYXRhX2lkXCIsIGlkIHx8IG9iai5kYXRhX2lkKTtcbiAgb2JqLlBvc3RlciA9PT0gXCJOL0FcIiA/ICRwb3N0ZXJfdGQgPSAkKFwiPHRkPjxpbWcgc3JjPSdcIiArIFwiaHR0cHM6Ly93d3cudXRvcG9saXMubHUvYnVuZGxlcy91dG9wb2xpc2NvbW1vbi9pbWFnZXMvbW92aWVzL21vdmllLXBsYWNlaG9sZGVyLmpwZ1wiICsgXCInPjwvdGQ+XCIpIDogJHBvc3Rlcl90ZCA9ICQoXCI8dGQ+PGltZyBzcmM9J1wiICsgb2JqLlBvc3RlciArIFwiJz48L3NyYz5cIik7XG4gIHZhciBvdGhlcl9yb3dzID0gXCI8dGQ+XCIgKyBvYmouVGl0bGUgKyBcIjwvdGQ+PHRkPlwiICsgb2JqLlllYXIgKyBcIjwvdGQ+PHRkPlwiO1xuICBvdGhlcl9yb3dzICs9IG1ha2VSYXRpbmdJbWdUZXh0KG9iaik7XG4gIG90aGVyX3Jvd3MgKz0gXCI8L3RkPlwiXG4gIG90aGVyX3Jvd3MgKz0gXCI8dGQ+PGJ1dHRvbiBjbGFzcz0ndHJhaWxlci1idG4nIHF1ZXJ5PSdcIiArIG9iai5UaXRsZS5yZXBsYWNlKC9bXFwuLC1cXC8jISQlXFxeJlxcKjs6e309XFwtX2B+KCldL2csXCJcIikuc3BsaXQoXCIgXCIpLmpvaW4oXCItXCIpICsgXCInPlZpZXc8L2J1dHRvbj5cIlxuICBvdGhlcl9yb3dzICs9IFwiPHRkPjxwIFwiICsgbWFrZU1ldGFSYXRpbmdUZXh0KG9iaikgKyBcIjwvcD48L3RkPlwiO1xuICBvdGhlcl9yb3dzICs9IFwiPHRkPjxwIGNsYXNzPSdpbWRiLXJhdGluZyc+XCIgKyBvYmouaW1kYlJhdGluZyArIFwiPC9wPjwvdGQ+XCI7XG4gIG90aGVyX3Jvd3MgKz0gXCI8dGQ+PGJ1dHRvbiBjbGFzcz0nd2F0Y2hlZC1idG4nPldhdGNoZWQ8L2J1dHRvbj48L3RkPlwiO1xuICB2YXIgJG90aGVyX3Jvd3MgPSAkKG90aGVyX3Jvd3MpO1xuICAkb3RoZXJfcm93cy5maW5kKFwiYnV0dG9uLndhdGNoZWQtYnRuXCIpLmFkZENsYXNzKFwiYnRuIGJ0bi1tZCBidG4tZGFuZ2VyXCIpO1xuICAkb3RoZXJfcm93cy5maW5kKFwiYnV0dG9uLnRyYWlsZXItYnRuXCIpLmFkZENsYXNzKFwiYnRuIGJ0bi1tZCBidG4tZGVmYXVsdFwiKTtcbiAgJHJvdy5hcHBlbmQoJHBvc3Rlcl90ZCkuYXBwZW5kKCRvdGhlcl9yb3dzKTtcbiAgcmV0dXJuICRyb3c7XG59XG5cbmZ1bmN0aW9uIG1ha2VNZXRhUmF0aW5nVGV4dChvYmopIHtcblx0dmFyIHJldHVybl9zdHIgPSBcImNsYXNzPSdtZXRhc2NvcmUgXCI7XG5cdGlmIChwYXJzZUludChvYmouTWV0YXNjb3JlKSA+IDYwKSB7XG4gIFx0cmV0dXJuX3N0ciArPSBcIm1ldGEtcG9zaXRpdmVcIjtcbiAgfSBlbHNlIGlmIChwYXJzZUludChvYmouTWV0YXNjb3JlKSA+IDM5KSB7XG4gIFx0cmV0dXJuX3N0ciArPSBcIm1ldGEtbmV1dHJhbFwiO1xuICB9IGVsc2UgaWYgKHBhcnNlSW50KG9iai5NZXRhc2NvcmUpID49IDApIHtcbiAgXHRyZXR1cm5fc3RyICs9IFwibWV0YS1uZWdhdGl2ZVwiO1xuICB9XG4gIHJldHVybl9zdHIgKz0gXCInPlwiKyBvYmouTWV0YXNjb3JlXG4gIHJldHVybiByZXR1cm5fc3RyO1xufVxuXG5mdW5jdGlvbiBtYWtlUmF0aW5nSW1nVGV4dChvYmopIHtcblx0aWYgKG9iai5SYXRlZCA9PT0gXCJHXCIpIHtcbiAgXHRyZXR1cm4gXCI8aW1nIGNsYXNzPSdyYXRpbmctaW1nJyBzcmM9Jy4uL2ltYWdlcy9HLnN2Zyc+XCI7XG4gIH0gZWxzZSBpZiAob2JqLlJhdGVkID09PSBcIlBHXCIpIHtcbiAgXHRyZXR1cm4gXCI8aW1nIGNsYXNzPSdyYXRpbmctaW1nJyBzcmM9Jy4uL2ltYWdlcy9QRy5zdmcnPlwiO1xuICB9IGVsc2UgaWYgKG9iai5SYXRlZCA9PT0gXCJQRy0xM1wiKSB7XG4gIFx0cmV0dXJuIFwiPGltZyBjbGFzcz0ncmF0aW5nLWltZycgc3JjPScuLi9pbWFnZXMvUEctMTMuc3ZnJz5cIjtcbiAgfSBlbHNlIGlmIChvYmouUmF0ZWQgPT09IFwiUlwiKSB7XG4gIFx0cmV0dXJuIFwiPGltZyBjbGFzcz0ncmF0aW5nLWltZycgc3JjPScuLi9pbWFnZXMvUi5zdmcnPlwiO1xuICB9IGVsc2UgaWYgKG9iai5SYXRlZCA9PT0gXCJOQy0xN1wiKSB7XG4gIFx0cmV0dXJuIFwiPGltZyBjbGFzcz0ncmF0aW5nLWltZycgc3JjPScuLi9pbWFnZXMvTkMtMTcuc3ZnJz5cIjtcbiAgfSBlbHNlIHtcbiAgXHRyZXR1cm4gXCI8c3Bhbj5OL0E8L3NwYW4+XCJcbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVRvRmlyZWJhc2Uob2JqKSB7XG4gIHZhciBuZXdQdXNoID0gbW92aWVsaXN0LnB1c2gob2JqKTtcbiAgb2JqLmRhdGFfaWQgPSBuZXdQdXNoLmtleSgpO1xuXG4gIC8vJC5wb3N0KGAke0ZJUkVCQVNFX1VSTH0vdXNlcnMvJHtmYi5nZXRBdXRoKCkudWlkfS9tb3ZpZWxpc3QuanNvbj9hdXRoPSR7ZmIuZ2V0QXV0aCgpLnRva2VufWAsIEpTT04uc3RyaW5naWZ5KG9iaiksIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gIC8vICBvYmouZGF0YV9pZCA9IHJlc3BvbnNlLm5hbWU7XG4gIC8vfSlcbn1cblxuZnVuY3Rpb24gZGVsZXRlRnJvbUZpcmViYXNlKGlkKSB7XG4gIG1vdmllbGlzdC5jaGlsZChpZCkuc2V0KG51bGwpO1xuXG4gIC8vIHZhciBkZWxldGVVcmwgPSBgJHtGSVJFQkFTRV9VUkx9L3VzZXJzLyR7ZmIuZ2V0QXV0aCgpLnVpZH0vbW92aWVsaXN0LyR7aWR9Lmpzb24/YXV0aD0ke2ZiLmdldEF1dGgoKS50b2tlbn1gO1xuICAvLyAkLmFqYXgoe3VybDogZGVsZXRlVXJsLCB0eXBlOiAnREVMRVRFJ30pO1xufVxuXG4vL2Z1bmN0aW9uIHRhYmxlTG9hZCgpIHtcbi8vICAkLmdldChgJHtGSVJFQkFTRV9VUkx9L3VzZXJzLyR7ZmIuZ2V0QXV0aCgpLnVpZH0vbW92aWVsaXN0Lmpzb24/YXV0aD0ke2ZiLmdldEF1dGgoKS50b2tlbn1gLCBmdW5jdGlvbihkYl9kYXRhKSB7XG4vLyAgICBkYl9kYXRhICYmIF8oZGJfZGF0YSkuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4vLyAgICAgIGFkZFRvVGFibGUodmFsdWUsIGtleSk7XG4vLyAgICB9KS52YWx1ZSgpO1xuLy8gIH0pXG4vL31cbiJdfQ==
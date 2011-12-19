(function() {
  var getData;
  getData = function() {
    return $.post("add_collection", {
      mattpath: $(".sdbDirectory").val()
    }, function(result) {
      return $("#collections_current").html(result.added_collection).hide().fadeIn(500);
    });
  };
  $(function() {
    return getData();
  });
}).call(this);

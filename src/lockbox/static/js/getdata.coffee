getData = ->
  $.post "add_collection",
    { mattpath: $(".sdbDirectory").val() }
    (result) ->
      $("#collections_current").html(result.added_collection).hide().fadeIn(500)

$ ->
  getData()
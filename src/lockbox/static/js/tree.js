  $(document).ready(function() {
    $("#dirtree").bind("select_node.jstree", function(e, data) {
			$.data(document.body, "sdbDirectory", data.rslt.obj.attr("path"));
    }).jstree({
      "core" : {},
      "plugins" : [ "themes", "json_data", "ui" ],
      "json_data" : {
        "ajax" : {
          "url" : "/tree_json",
          "data" : function(n) {
            return {
              path : n.attr ? n.attr("path") : "~"
            };
          }
        }
      }
    });
    $("#configurationForm").validate({
      rules : {
        userPassword : "required",
        verifyPassword : {
          equalTo : "#userPassword"
        }
      }
    });
  });

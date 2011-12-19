$(function(){

  // Tabs
  $('#tabs-left').tabs().removeClass('ui-corner-all');


  // Dialog
  $('#dialog').dialog({
    modal: true,
    autoOpen: false,
    open: function(){
      $('.ui-widget-overlay').hide().fadeIn('fast');
    },
    beforeClose: function(){
      $('.ui-widget-overlay').remove();
      $("<div />", {
        'class':'ui-widget-overlay'
      }).css(
        {
          height: $("body").outerHeight(),
          width: $("body").outerWidth(),
          zIndex: 1001
        }
      ).appendTo("body").fadeOut('fast', function(){
        $(this).remove();
      });
    },
    show: 'fade',
    hide: 'fade',
    close: 'fade',
    width: 800,
    height: 600,
    buttons: {
      "Sync Directory": function() {
        $.post("/add_collection",
               { path: $.data(document.body, 'sdbDirectory') },
               function(data) {
                 if (!data.saved) {
                   return $("#collections_current").html(data.message).hide().fadeIn(3000);
                 }
                 $("#collections_current").load("get_collections");
               },
               "json"
              );
        $(this).dialog("close");
      },
      "Cancel": function() {
        $(this).dialog("close");
      },
    }
  });

  $('#collaborators-new').dialog({
    modal: true,
    autoOpen: false,
    open: function(){
      $('.ui-widget-overlay').hide().fadeIn('fast');
    },
    beforeClose: function(){
      $('.ui-widget-overlay').remove();
      $("<div />", {
        'class':'ui-widget-overlay'
      }).css(
        {
          height: $("body").outerHeight(),
          width: $("body").outerWidth(),
          zIndex: 1001
        }
      ).appendTo("body").fadeOut('fast', function(){
        $(this).remove();
      });
    },
    show: 'fade',
    hide: 'fade',
    close: 'fade',
    draggable: false,
    width: 600,
    buttons: {
			"Create an account": function() {
				var bValid = true;
				allFields.removeClass( "ui-state-error" );

				bValid = bValid && checkLength( name, "username", 3, 16 );
				bValid = bValid && checkLength( email, "email", 6, 80 );

				bValid = bValid && checkRegexp( name, /^[a-z]([0-9a-z_])+$/i, "Username may consist of a-z, 0-9, underscores, begin with a letter." );
				// From jquery.validate.js (by joern), contributed by Scott Gonzalez: http://projects.scottsplayground.com/email_address_validation/
				bValid = bValid && checkRegexp( email, /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i, "eg. ui@jquery.com" );

				if ( bValid ) {
          $.post("/new_collaborator",
                 { name: name.val(),
                   email: email.val() },
                 function(data) {
                   if (!data.success) {
                     return false;
                   }
                 },
                 'json');
					$( "#users tbody" ).append( "<tr>" +
							                        "<td>" + name.val() + "</td>" +
							                        "<td>" + email.val() + "</td>" +
						                          "</tr>" );
					$( this ).dialog( "close" );
				}
      },
      "Cancel": function() {
        $(this).dialog("close");
      },
    }
  });

  // Dialog Link
  $('#dialog_link').click(function(){
    $('#dialog').dialog('open');
    return false;
  });

  //////////////////////////////////////////////////////////////////////
  // New User Form

	var name = $( "#name" ),
	email = $( "#email" ),
	allFields = $( [] ).add( name ).add( email );

	function checkLength( o, n, min, max ) {
		if ( o.val().length > max || o.val().length < min ) {
			o.addClass( "ui-state-error" );
			updateTips( "Length of " + n + " must be between " +
					        min + " and " + max + "." );
			return false;
		} else {
			return true;
		}
	}

	function checkRegexp( o, regexp, n ) {
		if ( !( regexp.test( o.val() ) ) ) {
			o.addClass( "ui-state-error" );
			updateTips( n );
			return false;
		} else {
			return true;
		}
	}



  //////////////////////////////////////////////////////////////////////

  $('#collaborators_new_link').click(function(){
    $('#collaborators-new').dialog('open');
    return false;
  });

  $("#edit-collection").dialog({
    autoOpen: false,
    modal: true,
    width: 800,
    buttons: {
      "Save": function() {
        // Prepare collection membership data.
        var data = { 'user_ids' : [] };
        var collection = $("form[id^=members]").attr('id');
        $("input:checked").each(function() {
          data['user_ids'].push($(this).val());
        });

        // Send the collection membership update data.
        $.post("/edit_membership",
               {'collection': collection,
                'checked': JSON.stringify(data.user_ids)});
        $(this).dialog("close");
      },
      "Cancel": function() {
        $(this).dialog("close");
      }
    }
  });
  $("a[id^=edit_collection]").live("click", function () {
    var id = $(this).parent().attr('data-id');
    $.post('collection_collaborators',
           { id : id },
           function(data) {
             if (!data.success) {
               return false;
             }
             return $("#collection_collaborators").html(data.markup);
           },
           "json");
    $("#edit-collection").data('data-id', id).dialog('open')
    return false;
  });

  $("#collections_current").load("get_collections");
  $("#collaborators_current").load("get_collaborators");

});

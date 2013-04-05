/*
 * Utilities - not project specific.
 */
var UTIL = UTIL || {};

/*
 * Allows for simple 2 way binding of DOM elements to a model.
 */
UTIL.DataBinder = function( object_id ) {
    // Use a jQuery object as simple PubSub
    var pubSub = jQuery({});

    // We expect a `data` element specifying the binding
    // in the form: data-bind-<object_id>="<property_name>"
    var data_attr = "bind-" + object_id,
        message = object_id + ":change";

    // Listen to change events on elements with the data-binding attribute and proxy
    // them to the PubSub, so that the change is "broadcasted" to all connected objects
    jQuery( document ).on( "change", "[data-" + data_attr + "]", function( evt ) {
        var $input = jQuery( this );

        pubSub.trigger( message, [ $input.data( data_attr ), $input.val() ] );
    });
    // PubSub propagates changes to all bound elements, setting value of
    // input tags or HTML content of other tags

    pubSub.on( message, function( evt, prop_name, new_val ) {
        jQuery( "[data-" + data_attr + "=" + prop_name + "]" ).each( function() {
            var $bound = jQuery( this );

            if ( $bound.is("input, textarea, select") ) {
                $bound.val( new_val );
            } else {
                $bound.html( new_val );
            }
        });
    });

    return pubSub;
}

// Pad integer with zeros. returns string.
UTIL.pad = function( number, digits ) {
    return Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
}

UTIL.dropDown = function( $container ) {
    $(function(){
        console.log($('.current-indicator', $container).html());
        $('.current-indicator', $container).click(function(){
            alert("CLICK!");
            $('.list-parent', $container).show();        
        });
        $('.list-parent a', $container).click(function(e){
            $('.current-indicator', $container).text($(this).text());
            $('.list-parent', $container).hide(); 
            $(this).addClass('current');
            e.preventDefault();
        })
    })
}


/*
 * Extending native  prototypes
 */
String.prototype.padLeft = function (length, character) { 
    return new Array(length - this.length + 1).join(character || ' ') + this; 
};

Date.prototype.toFormattedString = function () {
    return [
        String(this.getFullYear()),
        String(this.getMonth()+1).padLeft(2, '0'),
        String(this.getDate()).padLeft(2, '0'),
        String(this.getHours()).padLeft(2, '0'),
        String(this.getMinutes()).padLeft(2, '0'),
        String(this.getSeconds()).padLeft(2, '0')
            ].join("-");
};

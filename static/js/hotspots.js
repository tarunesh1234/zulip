var hotspots = (function () {

var exports = {};

// popover orientations
var TOP = 'top';
var LEFT = 'left';
var RIGHT = 'right';
var BOTTOM = 'bottom';
var VIEWPORT_CENTER = 'viewport_center';

// popover orientation can optionally be fixed here (property: popover),
// otherwise popovers.compute_placement is used to compute orientation
var HOTSPOT_LOCATIONS = {
    click_to_reply: {
        element: '.selected_message .messagebox-content',
        offset_x: 0.5,
        offset_y: 0.5,
    },
    new_topic_button: {
        element: '#left_bar_compose_stream_button_big',
        offset_x: 0,
        offset_y: 0,
    },
    stream_settings: {
        element: '#streams_inline_cog',
        offset_x: 0.5,
        offset_y: 0.5,
    },
};

// popover illustration url(s)
var WHALE = '/static/images/hotspots/whale.svg';


exports.map_hotspots_to_DOM = function (hotspots, locations) {
    hotspots.forEach(function (hotspot) {
        hotspot.location = locations[hotspot.name];
    });
};

exports.post_hotspot_as_read = function (hotspot_name) {
    channel.post({
        url: '/json/users/me/hotspots',
        data: { hotspot: JSON.stringify(hotspot_name) },
        error: function (err) {
            blueslip.error(err.responseText);
        },
    });
};

function place_icon(hotspot) {
    var element = $(hotspot.location.element);
    var icon = $('#hotspot_' + hotspot.name + '_icon');

    if (element.length === 0 || element.css('display') === 'none' ||
        !element.is(':visible') || element.is(':hidden')) {
        icon.css('display', 'none');
        return false;
    }

    var offset = {
        top: element.outerHeight() * hotspot.location.offset_y,
        left: element.outerWidth() * hotspot.location.offset_x,
    };
    var client_rect = element.get(0).getBoundingClientRect();
    var placement = {
        top: client_rect.top + offset.top,
        left: client_rect.left + offset.left,
    };
    icon.css('display', 'block');
    icon.css(placement);
    return true;
}

function place_popover(hotspot) {
    if (!hotspot.location.element) {
        return;
    }

    var popover_width = $('#hotspot_' + hotspot.name + '_overlay .hotspot-popover').outerWidth();
    var popover_height = $('#hotspot_' + hotspot.name + '_overlay .hotspot-popover').outerHeight();
    var el_width = $(hotspot.location.element).outerWidth();
    var el_height = $(hotspot.location.element).outerHeight();
    var arrow_offset = 20;

    var popover_offset;
    var arrow_placement;
    var orientation = hotspot.location.popover ||
        popovers.compute_placement(
            $(hotspot.location.element),
            popover_height,
            popover_width,
            false
        );

    switch (orientation) {
        case TOP:
            popover_offset = {
                top: -(popover_height + arrow_offset),
                left: (el_width / 2) - (popover_width / 2),
            };
            arrow_placement = 'bottom';
            break;

        case LEFT:
            popover_offset = {
                top: (el_height / 2) - (popover_height / 2),
                left: -(popover_width + arrow_offset),
            };
            arrow_placement = 'right';
            break;

        case BOTTOM:
            popover_offset = {
                top: el_height + arrow_offset,
                left: (el_width / 2) - (popover_width / 2),
            };
            arrow_placement = 'top';
            break;

        case RIGHT:
            popover_offset = {
                top: (el_height / 2) - (popover_height / 2),
                left: el_width + arrow_offset,
            };
            arrow_placement = 'left';
            break;

        case VIEWPORT_CENTER:
            popover_offset = {
                top: el_height / 2,
                left: el_width / 2,
            };
            arrow_placement = '';
            break;

        default:
            blueslip.error(
                'Invalid popover placement value for hotspot \'' +
                hotspot.name + '\''
            );
            break;
    }

    // position arrow
    arrow_placement = 'arrow-' + arrow_placement;
    $('#hotspot_' + hotspot.name + '_overlay .hotspot-popover')
        .removeClass('arrow-top arrow-left arrow-bottom arrow-right')
        .addClass(arrow_placement);

    // position popover
    var popover_placement;
    if (orientation === VIEWPORT_CENTER) {
        popover_placement = {
            top: '45%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
        };
    } else {
        var client_rect = $(hotspot.location.element).get(0).getBoundingClientRect();
        popover_placement = {
            top: client_rect.top + popover_offset.top,
            left: client_rect.left + popover_offset.left,
            transform: '',
        };
    }

    $('#hotspot_' + hotspot.name + '_overlay .hotspot-popover')
        .css(popover_placement);
}

function insert_hotspot_into_DOM(hotspot) {
    var hotspot_overlay_HTML = templates.render('hotspot_overlay', {
        name: hotspot.name,
        title: hotspot.title,
        description: hotspot.description,
        img: WHALE,
    });

    var hotspot_icon_HTML =
        '<div class="hotspot-icon" id="hotspot_' + hotspot.name + '_icon">' +
            '<span class="dot"></span>' +
            '<span class="pulse"></span>' +
        '</div>';

    setTimeout(function () {
        $('body').prepend(hotspot_icon_HTML);
        $('body').prepend(hotspot_overlay_HTML);
        if (place_icon(hotspot)) {
            place_popover(hotspot);
        }

        // reposition on any event that might update the UI
        ['resize', 'scroll', 'onkeydown', 'click']
        .forEach(function (event_name) {
            window.addEventListener(event_name, _.debounce(function () {
                if (place_icon(hotspot)) {
                    place_popover(hotspot);
                }
            }, 10), true);
        });
    }, (hotspot.delay * 100));
}

exports.is_open = function () {
    return $('.hotspot.overlay').hasClass('show');
};

exports.load_new = function (new_hotspots) {
    exports.map_hotspots_to_DOM(new_hotspots, HOTSPOT_LOCATIONS);
    new_hotspots.forEach(insert_hotspot_into_DOM);
};

exports.initialize = function () {
    exports.load_new(page_params.hotspots);
};

return exports;
}());
if (typeof module !== 'undefined') {
    module.exports = hotspots;
}

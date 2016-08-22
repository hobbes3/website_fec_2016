define([
    "jquery",
    "d3",
    "underscore",
    "js/helper"
],
function(
    $,
    d3,
    _,
    helper
) {
    return function(data) {
        var green = data.green,
            red = data.red,
            width = Math.min($("#viz_timecharts").parent().innerWidth(), 1500),
            height = width * 0.4,
            radius = height / 2 * 0.8,
            thickness = radius * 0.2;

        var svg = d3.select("svg#viz_timecharts")
                .attr({
                    "width": width,
                    "height": height
                });



    }
});

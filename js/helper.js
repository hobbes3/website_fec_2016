define([
    "d3",
    "underscore"
],
function(
    d3,
    _
) {
    var helper = {};

    helper.tooltip_position = function() {
        helper.tooltip
            .style("top", (d3.event.pageY - 10) + "px")
            .style("left", (d3.event.pageX + 10) + "px");
    }

    helper.tooltip = d3.select("body")
        .append("div")
            .attr("id", "tooltip");

    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    }

    helper.dollar_format = d3.format(",d");

    helper.pct_label = function(pct) {
        return pct < 1 ? "<1%" : Math.round(pct) + "%";
    }

    helper.round_nearest = function(num, scale, direction) {
        if(direction === "up") {
            return Math.ceil(num / scale) * scale;
        }
        else if(direction === "down") {
            return Math.floor(num / scale) * scale;
        }
        else {
            return undefined;
        }
    }

    helper.get_translate = function(translate) {
        var match = /^translate\(([^,]+),(.+)\)/.exec(translate);
        return [parseFloat(match[1]), parseFloat(match[2])];
    }

    return helper;
});

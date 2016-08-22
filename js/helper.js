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

    return helper;
});

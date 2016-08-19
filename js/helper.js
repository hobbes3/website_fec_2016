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
        helper.tooltip.style({
            "top": (d3.event.pageY - 10) + "px",
            "left": (d3.event.pageX + 10) + "px"
        });
    }

    helper.tooltip = d3.select("body")
        .append("div")
            .attr("id", "tooltip");

    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    }

    helper.dollar_format = d3.format("0,000");

    helper.pct_label = function(pct) {
        return pct < 1 ? "<1%" : Math.round(pct) + "%";
    }

    _.mixin({
        "total": function(data, key) {
            return _(data).chain()
                .pluck("spent")
                .reduce(function(memo, num) {
                    return memo + parseInt(num);
                }, 0)
                .value();
        }
    });

    d3.json("/data/schedule_e.json", function(json) {
        var data = {};

        data.total = _(json.results).chain()
            .pluck("spent")
            .reduce(function(memo, num) {
                return memo + parseInt(num);
            }, 0)
            .value();

        data.outer = _(json.results).map(function(v, i) {
            v.spent = parseInt(v.spent);
            v._index = i;

            return v;
        });

        data.inner = _(data.outer).chain()
            .groupBy("candidate")
            .map(function(v, k) {
                return {
                    "name": k,
                    "total": _(v).chain()
                        .pluck("spent")
                        .reduce(function(memo, num) {
                            return memo + parseInt(num);
                        }, 0)
                        .value(),
                    "data": v
                };
            })
            .value();

        helper.data = data;

        //return helper;
    });

    return helper;
});

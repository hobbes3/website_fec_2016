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
            width = Math.min($("#viz_timecharts").parent().innerWidth(), 1200),
            height = width * 0.3
            img_ratio = 190 / 616,
            img_width = height / 2 * img_ratio;

        var svg = d3.select("svg#viz_timecharts")
            .attr("width", width)
            .attr("height", height);

        var chart_g = svg.selectAll("g.timechart")
            .data(data.timechart)
            .enter()
            .append("g")
                .attr("class", "timechart")
                .attr("transform", function(d, i) {
                    var x = 0;
                    var y = height / 2 * i;

                    return "translate(" + [x, y] + ")";
                });

        var image = chart_g
            .append("image")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", img_width)
                .attr("height", height / 2)
                .attr("xlink:href", function(d) {
                    return "/images/" + d.candidate + "_strip.jpg";
                })
                .on("mouseover", function(d) {
                    helper.tooltip
                        .style("visibility", "visible")
                        .text(d.candidate.capitalize());
                })
                .on("mousemove", helper.tooltip_position)
                .on("mouseout", function(d) {
                    helper.tooltip.style("visibility", "hidden");
                });

        var timechart_g = chart_g
            .append("g")
                .attr("transform", "translate(" + [img_width, 0] + ")");

        function round_nearest(num, scale, direction) {
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

        var max_spent = 0;
        var min_poll = {};
        var max_poll_range = 0;
        var min_poll_date;

        _(data.timechart).each(function(v) {
            var max_supporting = _(v.data).chain().pluck("supporting").max().value();
            var max_opposing = _(v.data).chain().pluck("opposing").max().value();

            var p_max = _(v.data).chain().pluck("poll").max().value();
            var p_min = _(v.data).chain().pluck("poll").min().value();

            min_poll[v.candidate] = round_nearest(p_min, 5, "down");

            max_spent = Math.max(max_spent, max_supporting, max_opposing);
            max_poll_range = Math.max(max_poll_range, p_max - p_min);
        });

        max_spent = round_nearest(max_spent, 1000000, "up");
        max_poll_range = round_nearest(max_poll_range, 5, "up");

        var x = d3.scaleTime()
            .domain([new Date("2015-05-01"), new Date("2016-11-08")])
            .range([0, width - img_width]);

        var y_spent = d3.scaleLinear()
            .domain([max_spent, 0])
            .range([0, height / 2]);

        var y_poll = d3.scaleLinear()
            .range([0, height / 2]);

        var line = d3.line()
            .x(function(d) {
                return x(d.date);
            });

        timechart_g
            .append("path")
                .attr("class", "line")
                .attr("d", function(d) {
                    line.y(function(dd) {
                        return y_spent(dd.supporting);
                    });
                    return line(d.data);
                })
                .style("stroke", green);

        timechart_g
            .append("path")
                .attr("class", "line")
                .attr("d", function(d) {
                    line.y(function(dd) {
                        return y_spent(dd.opposing);
                    });
                    return line(d.data);
                })
                .style("stroke", red);

        timechart_g
            .append("path")
                .attr("class", "line")
                .attr("d", function(d) {
                    var p_min = min_poll[d.candidate];

                    y_poll.domain([p_min + max_poll_range, p_min]);

                    line
                        .y(function(dd) {
                            return y_poll(dd.poll);
                        })
                        .defined(function(dd) {
                            return !isNaN(dd.poll);
                        });

                    return line(d.data);
                })
                .style("stroke", "steelblue");
    }
});

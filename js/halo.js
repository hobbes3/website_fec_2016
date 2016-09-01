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
        var toward_option = "both",
            animation = false,
            green = data.green,
            red = data.red,
            width = Math.min($("#viz_halo").parent().innerWidth(), 1500),
            height = width * 0.7,
            radius = width / 2 * 0.55,
            radius_label = radius * 1.1, // default radius for label before label_relax()
            thickness = radius * 0.07,
            link_radius_cp_offset = radius * 0.2,
            radius_pack = 0.8 * (radius - thickness),
            padding_pack = radius * 0.1,
            opacity_link = 0.6,
            opacity_fade = 0.1,
            label_font_size = height * 0.014,
            label_spacing = radius * 0.01, // px between the text label and line
            label_wrap_length = radius * 0.7, // wrap to under in px
            label_relax_delta = 0.5, // increment in px to separate colliding labels per label_relax() execution
            label_relax_sleep = 10, // sleep label_relax() in ms
            transition_duration = 750, // in ms
            t = d3.transition().duration(transition_duration);

        var color_outer = d3.scaleOrdinal(d3.schemeCategory20b);

        var svg = d3.select("svg#viz_halo")
                .attr("width", width)
                .attr("height", height)
            .append("g")
                .attr("transform", "translate(" + [width / 2, height / 2] + ")");

        var outer = svg
            .append("g")
                .attr("class", "outer");

        var arc_outer = d3.arc()
            .innerRadius(radius - thickness)
            .outerRadius(radius);

        var pie_outer = d3.pie()
            .value(function(d) {
                return d.toward === toward_option || toward_option === "both" ? d.spent : 0;
            })
            .sort(null);

        function mouseout_default() {
            if(animation) return;

            helper.tooltip.style("visibility", "hidden");

            path_outer_g
                .transition()
                .style("opacity", 1.0);

            link
                .transition()
                .style("opacity", opacity_link);

            path_inner_g
                .transition()
                .style("opacity", 1.0);

            image
                .transition()
                .style("opacity", 1.0);
        }

        var path_outer_g = outer.selectAll("g.arc_outer")
            .data(pie_outer(data.outer))
            .enter()
            .append("g")
                .attr("class", "arc_outer")
                .on("mouseover", function(d) {
                    if(animation) return;

                    var committee = d.data["committee.name"].match("^others (supporting|opposing) ") ? "Others" : d.data["committee.name"],
                        committee_type = d.data["committee.committee_type_full"],
                        toward = d.data.toward,
                        candidate = d.data.candidate,
                        name = candidate.capitalize(),
                        spent = d.data.spent,
                        total = data.stats.total,
                        total_toward = _(data.stats.toward).findWhere({"toward": toward}).total,
                        pct = spent / total * 100,
                        pct_toward = spent / total_toward * 100;

                    var html = committee + " spent $" + helper.dollar_format(spent) + " " + toward + " " + name;

                    if(committee_type !== "none") {
                        html += "<br>Type: " + committee_type;
                    }

                    html += toward_option === "both" ?
                        "<br>" + helper.pct_label(pct) + " of total expenditures" :
                        "<br>" + helper.pct_label(pct_toward) + " of total expenditures " + toward + " a candidate";

                    helper.tooltip
                        .style("visibility", "visible")
                        .html(html);

                    path_outer_g
                        .transition()
                        .style("opacity", function(dd) {
                            return d.data._index === dd.data._index ? 1.0 : opacity_fade;
                        });

                    link
                        .transition()
                        .style("opacity", function(dd) {
                            return d.data._index === dd.data._index ? opacity_link : opacity_fade;
                        });

                    path_inner_g
                        .transition()
                        .style("opacity", function(dd) {
                            return d.data._index === dd.data._index ? 1.0 : opacity_fade;
                        });

                    image
                        .transition()
                        .style("opacity", function(dd) {
                            return d.data.candidate === dd.data.candidate ? 1.0 : opacity_fade;
                        });
                })
                .on("mousemove", helper.tooltip_position)
                .on("mouseout", mouseout_default);

        var path_outer = path_outer_g
            .append("path")
                .attr("d", arc_outer)
                .attr("fill", function(d) {
                    return color_outer(d.data["committee.name"]);
                })
                .each(function(d) {
                    this._current = d;
                });

        var label_group = outer.selectAll("g.arc_outer")
            .append("g")
                .attr("class", "label-group")
                .attr("visibility", "visible");

        var label_circle = label_group
            .append("circle")
                .attr("x", 0)
                .attr("y", 0)
                .attr("r", 2)
                .attr("transform", function (d, i) {
                    return "translate(" + arc_outer.centroid(d) + ")";
                })
                .attr("class", "label-circle")
                .each(function(d) {
                    this._current = d;
                });

        var label_line = label_group
            .append("line")
                .attr("x1", function (d) {
                    return arc_outer.centroid(d)[0];
                })
                .attr("y1", function (d) {
                    return arc_outer.centroid(d)[1];
                })
                .attr("x2", function (d) {
                    var c = arc_outer.centroid(d),
                        mid_angle = Math.atan2(c[1], c[0]),
                        x = Math.cos(mid_angle) * radius_label;
                    return x;
                })
                .attr("y2", function (d) {
                    var c = arc_outer.centroid(d),
                        mid_angle = Math.atan2(c[1], c[0]),
                        y = Math.sin(mid_angle) * radius_label;
                    return y;
                })
                .attr("class", "label-line")
                .each(function(d) {
                    this._current = d;
                });

        var label_text_g = label_group
            .append("g")
                .attr("class", "label-text-group")
                .attr("transform", function(d) {
                    var c = arc_outer.centroid(d),
                        mid_angle = Math.atan2(c[1], c[0]),
                        x = Math.cos(mid_angle) * radius_label,
                        sign = (x > 0) ? 1 : -1,
                        label_x = x + (2 * sign),
                        label_y = Math.sin(mid_angle) * radius_label;
                    return "translate(" + [label_x, label_y] + ")";
                })
                .each(function(d) {
                    this._current = d;
                });

        var label_text = label_text_g
            .append("text")
                .attr("x", 0)
                .attr("y", 0)
                .attr("dy", "0em")
                .attr("text-anchor", function (d) {
                    var c = arc_outer.centroid(d),
                        mid_angle = Math.atan2(c[1], c[0]),
                        x = Math.cos(mid_angle) * radius_label;
                    return (x > 0) ? "start" : "end";
                })
                .attr("dominant-baseline", "middle")
                .attr("class", function(d) {
                    var committee_type = d.data["committee.committee_type_full"];
                    if(committee_type.indexOf("Super PAC") >= 0 || committee_type === "none") {
                        return "label-text";
                    }
                    else {
                        return "label-text italic";
                    }

                })
                .style("fill", "white")
                .style("font-size", label_font_size)
                .text(function (d) {
                    return d.data["committee.name"];
                })
                .each(function(d) {
                    this._current = d;
                })
                .call(label_wrap, label_wrap_length);

        label_relax();

        // https://bl.ocks.org/mbostock/7555321
        function label_wrap(text, width) {
            text.each(function() {
                var text = d3.select(this),
                    g = d3.select(this.parentNode),
                    words = text.text().split(/\s+/).reverse(),
                    word,
                    wrapped = false,
                    line = [],
                    lineNumber = 0,
                    lineHeight = 1.1, // ems
                    dy = parseFloat(text.attr("dy")),
                    tspan = text.text(null)
                        .append("tspan")
                            .attr("x", 0)
                            .attr("y", 0)
                            .attr("dy", dy + "em");
                while(word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if(tspan.node().getComputedTextLength() > width) {
                        wrapped = true;
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text
                            .append("tspan")
                                .attr("x", 0)
                                .attr("y", 0)
                                .attr("dy", ++lineNumber * lineHeight + dy + "em")
                                .text(word);

                    }
                }
            });
        }

        // Based off of https://jsfiddle.net/thudfactor/HdwTH/
        function label_relax() {
            var adjusted = false;
            label_text_g
                .filter(function() {
                    return d3.select(this.parentNode).attr("visibility") !== "hidden";
                })
                .each(function() {
                    var a = this;

                    label_text_g
                        .filter(function() {
                            return d3.select(this.parentNode).attr("visibility") !== "hidden";
                        })
                        .each(function () {
                            var b = this,
                                da = d3.select(a),
                                db = d3.select(b),
                                ta = da.select("text").attr("text-anchor"),
                                tb = db.select("text").attr("text-anchor");

                            if(a === b || ta !== tb) return;

                            var ra = a.getBoundingClientRect(),
                                rb = b.getBoundingClientRect();

                            var overlap = ra.top - label_spacing < rb.bottom &&
                                          rb.top - label_spacing < ra.bottom &&
                                          ra.left - label_spacing < rb.right &&
                                          rb.left - label_spacing < ra.right;

                            if(!overlap) return;

                            adjusted = true;

                            var fa = helper.get_translate(da.attr("transform")),
                                fb = helper.get_translate(db.attr("transform")),
                                xa = fa[0],
                                ya = fa[1],
                                xb = fb[0],
                                yb = fb[1],
                                aa = da.datum().endAngle,
                                ab = db.datum().endAngle,
                                adjust = ta === "start" && aa > ab || ta === "end" && aa < ab ? label_relax_delta : -label_relax_delta;

                            da.attr("transform", "translate(" + [xa, ya + adjust] + ")");
                            db.attr("transform", "translate(" + [xb, yb - adjust] + ")");
                        });
                });

            if(adjusted) {
                label_line.attr("y2", function(d, i) {
                    var g_for_line = label_text_g.filter(function(dd, ii) {
                        return i === ii;
                    });
                        y = helper.get_translate(g_for_line.attr("transform"))[1];
                    return y;
                });

                setTimeout(label_relax, label_relax_sleep)
            }
        }

        var middle = svg
            .append("g")
                .attr("class", "middle");

        var inner = svg
            .append("g")
                .attr("class", "inner")
                .attr("transform", "translate(" + [-radius_pack, -radius_pack] + ")");

        var bubble_inner = d3.pack()
            .size([2 * radius_pack, 2 * radius_pack])
            .padding(padding_pack);

        var root = d3.hierarchy({"children": data.inner})
            .sum(function(d) {
                return _(d.data).chain()
                    .filter(function(v) {
                        return v.toward === toward_option || toward_option === "both";
                    })
                    .pluck("spent")
                    .reduce(function(memo, num) {
                        return memo + num;
                    }, 0)
                    .value();
            });

        var node_inner_g = inner.selectAll("g.node_inner")
            .data(bubble_inner(root).children)
            .enter()
            .append("g")
                .attr("class", function(d) {
                    return "node_inner " + d.candidate;
                })
                .attr("transform", function(d) {
                    return "translate(" + [d.x, d.y] + ")";
                });
            //.call(drag);

        var image = node_inner_g
            .append("image")
                .attr("x", function(d) {
                    return thickness - d.r;
                })
                .attr("y", function(d) {
                    return thickness - d.r;
                })
                .attr("width", function(d) {
                    return 2 * (d.r - thickness);
                })
                .attr("height", function(d) {
                    return 2 * (d.r - thickness);
                })
                .attr("xlink:href", function(d) {
                    return "/images/" + d.data.candidate + "_head.png";
                })
                .on("mouseover", function(d) {
                    if(animation) return;

                    var name = d.data.candidate.capitalize(),
                        spent = d.value,
                        total = data.stats.total,
                        pct = spent / total * 100,
                        html;


                    if(toward_option === "both") {
                        html = "$" + helper.dollar_format(d.value) + " went toward " + name + "<br>" +
                            helper.pct_label(pct) + " of total expenditures";
                    }
                    else {
                        total_toward = _(data.stats.toward).findWhere({"toward": toward_option}).total,
                        pct_toward = spent / total_toward * 100;

                        html = "$" + helper.dollar_format(d.value) + " went " + toward_option + " " + name + "<br>" +
                            helper.pct_label(pct_toward) + " of total expenditures " + toward_option + " a candidate";
                    }

                    helper.tooltip
                        .style("visibility", "visible")
                        .html(html);

                    path_outer_g
                        .transition()
                        .style("opacity", function(dd) {
                            return d.data.candidate === dd.data.candidate ? 1.0 : opacity_fade;
                        });

                    link
                        .transition()
                        .style("opacity", function(dd) {
                            return d.data.candidate === dd.data.candidate ? opacity_link : opacity_fade;
                        });

                    path_inner_g
                        .transition()
                        .style("opacity", function(dd) {
                            return d.data.candidate === dd.data.candidate ? 1.0 : opacity_fade;
                        });

                    image
                        .transition()
                        .style("opacity", function(dd) {
                            return d.data.candidate === dd.data.candidate ? 1.0 : opacity_fade;
                        });
                })
                .on("mousemove", helper.tooltip_position)
                .on("mouseout", mouseout_default);

        var arc_inner = d3.arc();

        var pie_inner = d3.pie()
            .value(function(d) {
                return d.toward === toward_option || toward_option === "both" ? d.spent : 0;
            })
            .sort(null);

        var path_inner_g = node_inner_g.selectAll("g.arc_inner")
            .data(function(d) {
                return pie_inner(d.data.data).map(function(m) {
                    m.r = d.r;
                    return m;
                });
            })
            .enter()
            .append("g")
                .attr("class", "arc_inner")
                .on("mouseover", function(d) {
                    if(animation) return;

                    var committee = d.data["committee.name"].match("^others (supporting|opposing) ") ? "Others" : d.data["committee.name"],
                        committee_type = d.data["committee.committee_type_full"],
                        toward = d.data.toward,
                        candidate = d.data.candidate,
                        name = candidate.capitalize(),
                        spent = d.data.spent,
                        total = _(data.stats.candidate).findWhere({"candidate": candidate}).total,
                        total_toward = _(_(data.stats.candidate).findWhere({"candidate": candidate}).toward).findWhere({"toward": toward}).total,
                        pct = spent / total * 100,
                        pct_toward = spent / total_toward * 100;

                    var html = committee + " spent $" + helper.dollar_format(spent) + " " + toward + " " + name;

                    if(committee_type !== "none") {
                        html += "<br>Type: " + committee_type;
                    }

                    html += toward_option === "both" ?
                        "<br>" + helper.pct_label(pct) + " of total expenditures spent on " + name :
                        "<br>" + helper.pct_label(pct_toward) + " of total expenditures spent " + toward + " " + name;

                    helper.tooltip
                        .style("visibility", "visible")
                        .html(html);

                    path_outer_g
                        .transition()
                        .style("opacity", function(dd) {
                            return d.data._index === dd.data._index ? 1.0 : opacity_fade;
                        });

                    link
                        .transition()
                        .style("opacity", function(dd) {
                            return d.data._index === dd.data._index ? opacity_link : opacity_fade;
                        });

                    path_inner_g
                        .transition()
                        .style("opacity", function(dd) {
                            return d.data._index === dd.data._index ? 1.0 : opacity_fade;
                        });

                    image
                        .transition()
                        .style("opacity", function(dd) {
                            return d.data.candidate === dd.data.candidate ? 1.0 : opacity_fade;
                        });
                })
                .on("mousemove", helper.tooltip_position)
                .on("mouseout", mouseout_default);

        function link_data(data) {
            return pie_outer(data.outer).map(function(d) {

                var node = bubble_inner(root).children
                    .filter(function(dd) {
                        return dd.data.candidate === d.data.candidate;
                    });

                d.node_x = node[0].x;
                d.node_y = node[0].y;
                d.node_r = node[0].r;

                var inner = pie_inner(_(data.inner).findWhere({"candidate": d.data.candidate}).data)
                    .filter(function(dd) {
                        return d.data._index === dd.data._index;
                    });

                d.inner_startAngle = inner[0].startAngle;
                d.inner_endAngle = inner[0].endAngle;

                return d;
            });
        }

        function link_d_path(d) {
            if(d.value === 0) return "";

            var r_o = radius - thickness,
                offset = -Math.PI / 2,
                path_o_start = d.startAngle + offset,
                path_o_end   = d.endAngle   + offset,
                cx_i = -radius_pack + d.node_x,
                cy_i = -radius_pack + d.node_y,
                path_i_start = d.inner_startAngle + offset,
                path_i_end   = d.inner_endAngle   + offset,
                angle_diff = ((path_o_start + path_o_end) / 2 + (path_i_start + path_i_end) / 2) / 2,
                r_i = d.node_r,
                path = d3.path();

            path.arc(0, 0, r_o, path_o_start, path_o_end);
            path.bezierCurveTo(
                r_o * Math.cos(path_o_end),
                r_o * Math.sin(path_o_end),
                cx_i + (r_i + link_radius_cp_offset) * Math.cos(path_i_end),
                cy_i + (r_i + link_radius_cp_offset) * Math.sin(path_i_end),
                cx_i + r_i * Math.cos(path_i_end),
                cy_i + r_i * Math.sin(path_i_end)
            );
            path.arc(cx_i, cy_i, r_i, path_i_end, path_i_start, true);
            path.bezierCurveTo(
                cx_i + (r_i + link_radius_cp_offset) * Math.cos(path_i_start),
                cy_i + (r_i + link_radius_cp_offset) * Math.sin(path_i_start),
                r_o * Math.cos(path_o_start),
                r_o * Math.sin(path_o_start),
                r_o * Math.cos(path_o_start),
                r_o * Math.sin(path_o_start)
            );

            return path.toString();
        }

        var link = middle.selectAll("path")
            .data(link_data(data))
            .enter()
            .append("path")
                .attr("d", function(d) {
                    return link_d_path(d);
                })
                .attr("class", "link")
                .style("opacity", opacity_link)
                .attr("fill", function(d) {
                    return d.data.toward === "supporting" ? green : red;
                })
                .on("mouseover", function(d) {
                    if(animation) return;

                    var committee = d.data["committee.name"].match("^others (supporting|opposing) (trump|hillary)$") ? "Others" : d.data["committee.name"],
                        committee_type = d.data["committee.committee_type_full"],
                        toward = d.data.toward,
                        candidate = d.data.candidate,
                        name = candidate.capitalize(),
                        spent = d.data.spent;

                    var html = committee + " spent $" + helper.dollar_format(spent) + " " + toward + " " + name;

                    if(committee_type !== "none") {
                        html += "<br>Type: " + committee_type;
                    }

                    helper.tooltip
                        .style("visibility", "visible")
                        .html(html);

                    path_outer_g
                        .transition()
                        .style("opacity", function(dd) {
                            return d.data._index === dd.data._index ? 1.0 : opacity_fade;
                        });

                    link
                        .transition()
                        .style("opacity", function(dd) {
                            return d.data._index === dd.data._index ? opacity_link : opacity_fade;
                        });

                    path_inner_g
                        .transition()
                        .style("opacity", function(dd) {
                            return d.data._index === dd.data._index ? 1.0 : opacity_fade;
                        });

                    image
                        .transition()
                        .style("opacity", function(dd) {
                            return d.data.candidate === dd.data.candidate ? 1.0 : opacity_fade;
                        });
                })
                .on("mouseout", mouseout_default)
                .on("mousemove", helper.tooltip_position)
                .each(function(d) {
                    this._current = d;
                });

        path_inner = path_inner_g
            .append("path")
                .attr("d", function(d) {
                    d.innerRadius = d.r - thickness;
                    d.outerRadius = d.r;

                    return arc_inner(d);
                })
                .style("fill", function(d) {
                    return d.data.toward === "supporting" ? green : red;
                })
                .each(function(d) {
                    this._current = d;
                });

        $("#toward_controls input[name=toward]").on("change", function() {
            helper.tooltip.style("visibility", "hidden");
            path_outer_g.style("opacity", 1.0);
            link.style("opacity", opacity_link);
            path_inner_g.style("opacity", 1.0);
            image.style("opacity", 1.0);

            var toward_option_previous = toward_option;
            toward_option = this.value;

            if(toward_option === toward_option_previous) {
                return;
            }

            animation = true;

            path_outer.data(pie_outer(data.outer))
                .transition(t)
                    .attrTween("d", function(d) {
                        var i = d3.interpolate(this._current, d);
                        this._current = i(0);
                        return function(t) {
                            return arc_outer(i(t));
                        };
                    });

            label_group
                .attr("visibility", "visible")
                .transition(t)
                    .style("opacity", function(d) {
                        return d.data.toward === toward_option || toward_option === "both" ? 1.0 : 0.0;
                    })
                    .on("end", function() {
                        d3.select(this).attr("visibility", function(d) {
                            return d.data.toward === toward_option || toward_option === "both" ? "visible" : "hidden";
                        });
                    });

            label_circle.data(pie_outer(data.outer))
                .transition(t)
                    .attrTween("transform", function(d) {
                        var i = d3.interpolate(this._current, d);
                        this._current = i(0);
                        return function(t) {
                            return "translate(" + arc_outer.centroid(i(t)) + ")";
                        };
                    });

            label_line.data(pie_outer(data.outer))
                .transition(t)
                    .attrTween("x1", function(d) {
                        var i = d3.interpolate(this._current, d);
                        this._current = i(0);
                        return function(t) {
                            return arc_outer.centroid(i(t))[0];
                        };
                    })
                    .attrTween("y1", function(d) {
                        var i = d3.interpolate(this._current, d);
                        this._current = i(0);
                        return function(t) {
                            return arc_outer.centroid(i(t))[1];
                        };
                    })
                    .attrTween("x2", function(d) {
                        var i = d3.interpolate(this._current, d);
                        this._current = i(0);
                        return function(t) {
                            var c = arc_outer.centroid(i(t)),
                                mid_angle = Math.atan2(c[1], c[0]);
                            return Math.cos(mid_angle) * radius_label;
                        };
                    })
                    .attrTween("y2", function(d) {
                        var i = d3.interpolate(this._current, d);
                        this._current = i(0);
                        return function(t) {
                            var c = arc_outer.centroid(i(t)),
                                mid_angle = Math.atan2(c[1], c[0]);
                            return Math.sin(mid_angle) * radius_label;
                        };
                    });

            label_text_g.data(pie_outer(data.outer))
                .transition(t)
                    .attrTween("transform", function(d) {
                        var i = d3.interpolate(this._current, d);
                        this._current = i(0);
                        return function(t) {
                            var c = arc_outer.centroid(i(t)),
                                mid_angle = Math.atan2(c[1], c[0]),
                                x = Math.cos(mid_angle) * radius_label,
                                adjust = x > 0 ? 5 : -5,
                                label_x = x + adjust,
                                label_y = Math.sin(mid_angle) * radius_label;
                            return "translate(" + [label_x, label_y] + ")";
                        };
                    });

            function end_all(transition, callback) {
                var n = 0;
                transition
                    .on("start", function() { ++n; })
                    .on("end", function() {
                        if(!--n) callback.apply(this, arguments);
                    });
            }

            label_text.data(pie_outer(data.outer))
                .transition(t)
                    .attrTween("text-anchor", function(d) {
                        var i = d3.interpolate(this._current, d);
                        this._current = i(0);
                        return function(t) {
                            var c = arc_outer.centroid(i(t)),
                                mid_angle = Math.atan2(c[1], c[0]),
                                x = Math.cos(mid_angle) * radius_label;
                            return x > 0 ? "start" : "end";
                        };
                    })
                    .call(end_all, function() {
                        animation = false;
                        mouseout_default();
                        label_relax();
                    });

            root = d3.hierarchy({"children": data.inner})
                .sum(function(d) {
                    return _(d.data).chain()
                        .filter(function(v) {
                            return v.toward === toward_option || toward_option === "both";
                        })
                        .pluck("spent")
                        .reduce(function(memo, num) {
                            return memo + num;
                        }, 0)
                        .value();
                });

            node_inner_g.data(bubble_inner(root).children)
                .transition(t)
                    .attr("transform", function(d) {
                        return "translate(" + [d.x, d.y] + ")"
                    });

            path_inner
                .data(function(d) {
                    return pie_inner(d.data.data).map(function(m) {
                        m.r = d.r;
                        return m;
                    })
                })
                .transition(t)
                    .attrTween("d", function(d) {
                        d.innerRadius = d.r - thickness;
                        d.outerRadius = d.r;
                        var i = d3.interpolate(this._current, d);
                        this._current = i(0);
                        return function(t) {
                            return arc_inner(i(t));
                        };
                    });

            link.data(link_data(data))
                .transition(t)
                    .attrTween("d", function(d) {
                        var i = d3.interpolate(this._current, d);
                        this._current = i(0);
                        return function(t) {
                            return link_d_path(i(t));
                        };
                    });

            image.data(bubble_inner(root).children)
                .transition(t)
                    .attr("x", function(d) {
                        return thickness - d.r;
                    })
                    .attr("y", function(d) {
                        return thickness - d.r;
                    })
                    .attr("width", function(d) {
                        return 2 * (d.r - thickness);
                    })
                    .attr("height", function(d) {
                        return 2 * (d.r - thickness);
                    });

        });
    };
});

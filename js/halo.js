require([
    "d3",
    "d3-path",
    "underscore",
],
function(
    d3,
    d3_path,
    _
) {
    var toward = "both",
        margin = {
            "top": 50,
            "right": 10,
            "bottom": 50,
            "left": 10
        },
        width = 1000 - margin.left - margin.right,
        height = 1000 - margin.top - margin.bottom,
        radius = Math.min(width, height) / 2 - Math.max(margin.top, margin.bottom),
        radius_label = radius + 40, // default radius for label before label_relax()
        thickness = 25,
        link_radius_cp_offset = 50,
        radius_pack = 0.8 * (radius - thickness),
        padding_pack = 30,
        transition_duration = 750, // in ms
        opacity_link = 0.6,
        opacity_fade = 0.1,
        label_spacing = 5, // 5 px between the text label and line
        label_wrap_length = 150, // wrap to under in px
        label_relax_delta = 0.5, // increment in px to separate colliding labels per label_relax() execution
        label_relax_sleep = 10; // sleep label_relax() in ms

    var tooltip = d3.select("body")
        .append("div")
            .style({
                "position": "absolute",
                "z-index": "100",
                "visibility": "hidden"
            });

    var tooltip_position = function() {
        tooltip.style({
            "top": (event.pageY - 10) + "px",
            "left": (event.pageX + 10) + "px"
        });
    }

    var dollar_format = d3.format("0,000");

    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    }

    var svg = d3.select("svg#viz_influence")
            .attr({
                "width": width + margin.left + margin.right,
                "height": height + margin.top + margin.bottom
            })
            .style({
                "display": "block",
                "margin": "auto"
            })
        .append("g")
            .attr("transform", "translate(" + [margin.left, margin.top] + ")")
        .append("g")
            .attr("transform", "translate(" + [width / 2, height / 2] + ")");

    d3.json("/data/schedule_e.json", function(json) {
        var data = {};

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
                    "data": v
                };
            })
            .value();

        var outer = svg
            .append("g")
                .attr("class", "outer");

        var color_outer = d3.scale.category20b();

        var arc_outer = d3.svg.arc()
            .innerRadius(radius - thickness)
            .outerRadius(radius);

        var pie_outer = d3.layout.pie()
            .value(function(d) {
                return d.toward === toward || toward === "both" ? d.spent : 0;
            })
            .sort(null);

        function mouseout_default() {
            tooltip.style("visibility", "hidden");

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
                    var who = d.data["committee.name"].match("^others (supporting|opposing) (trump|hillary)$") ? "Others" : d.data["committee.name"];

                    tooltip
                        .style("visibility", "visible")
                        .text(who + " spent $" + dollar_format(d.data.spent) + " " + d.data.toward + " " + d.data.candidate.capitalize());

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
                            return d.data.candidate === dd.name ? 1.0 : opacity_fade;
                        });
                })
                .on("mousemove", tooltip_position)
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

        var label_outer = outer.selectAll("g.arc_outer")
            .append("g")
                .attr({
                    "class": "label",
                    "visibility": "visible"
                });

        var label_circle = label_outer
            .append("circle")
                .attr({
                    "x": 0,
                    "y": 0,
                    "r": 2,
                    "transform": function (d, i) {
                        return "translate(" + arc_outer.centroid(d) + ")";
                    },
                    "class": "label-circle"
                })
                .each(function(d) {
                    this._current = d;
                });

        var label_line = label_outer
            .append("line")
                .attr({
                    "x1": function (d) {
                        return arc_outer.centroid(d)[0];
                    },
                    "y1": function (d) {
                        return arc_outer.centroid(d)[1];
                    },
                    "x2": function (d) {
                        var c = arc_outer.centroid(d),
                            mid_angle = Math.atan2(c[1], c[0]),
                            x = Math.cos(mid_angle) * radius_label;
                        return x;
                    },
                    "y2": function (d) {
                        var c = arc_outer.centroid(d),
                            mid_angle = Math.atan2(c[1], c[0]),
                            y = Math.sin(mid_angle) * radius_label;
                        return y;
                    },
                    "class": "label-line"
                })
                .each(function(d) {
                    this._current = d;
                });

        var label_text_g = label_outer
            .append("g")
                .attr({
                    "class": "label-text-group",
                    "transform": function(d) {
                        var c = arc_outer.centroid(d),
                            mid_angle = Math.atan2(c[1], c[0]),
                            x = Math.cos(mid_angle) * radius_label,
                            sign = (x > 0) ? 1 : -1,
                            label_x = x + (2 * sign),
                            label_y = Math.sin(mid_angle) * radius_label;
                        return "translate(" + [label_x, label_y] + ")";
                    }
                })
                .each(function(d) {
                    this._current = d;
                });

        var label_text = label_text_g
            .append("text")
                .attr({
                    "x": 0,
                    "y": 0,
                    "dy": "0em",
                    "text-anchor": function (d) {
                        var c = arc_outer.centroid(d),
                            mid_angle = Math.atan2(c[1], c[0]),
                            x = Math.cos(mid_angle) * radius_label;
                        return (x > 0) ? "start" : "end";
                    },
                    "dominant-baseline": "middle",
                    "class": "label-text"
                })
                .text(function (d) {
                    return d.data["committee.name"];
                })
                .each(function(d) {
                    this._current = d;
                });

        label_text.call(label_wrap, label_wrap_length);
        label_relax();

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
                            .attr({
                                "x": 0,
                                "y": 0,
                                "dy": dy + "em"
                            });
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
                                .attr({
                                    "x": 0,
                                    "y": 0,
                                    "dy": ++lineNumber * lineHeight + dy + "em"
                                })
                                .text(word);

                    }
                }
            });
        }

        function label_relax() {
            var adjusted = false;
            label_text_g
                .filter(function(d) {
                    return d3.select(this.parentNode).attr("visibility") !== "hidden";
                })
                .each(function(d) {
                    var a = this;

                    label_text_g
                        .filter(function(d) {
                            return d3.select(this.parentNode).attr("visibility") !== "hidden";
                        })
                        .each(function (d) {
                            var b = this,
                                da = d3.select(a),
                                db = d3.select(b),
                                ta = da.select("text").attr("text-anchor"),
                                tb = db.select("text").attr("text-anchor");

                            if(a === b || ta !== tb) return;

                            var ra = a.getBoundingClientRect(),
                                rb = b.getBoundingClientRect();

                            var overlap = ra.top - label_spacing < rb.bottom &&
                                          rb.top - label_spacing < ra.bottom;

                            if(!overlap) return;

                            adjusted = true;

                            var xa = d3.transform(da.attr("transform")).translate[0],
                                ya = d3.transform(da.attr("transform")).translate[1],
                                xb = d3.transform(db.attr("transform")).translate[0],
                                yb = d3.transform(db.attr("transform")).translate[1],
                                aa = da.datum().endAngle,
                                ab = db.datum().endAngle;

                                adjust = ta === "start" && aa > ab || ta === "end" && aa < ab ? label_relax_delta : -label_relax_delta;

                            da.attr("transform", "translate(" + [xa, ya + adjust] + ")");
                            db.attr("transform", "translate(" + [xb, yb - adjust] + ")");
                        });
                });

            if(adjusted) {
                label_line.attr("y2", function(d, i) {
                    var label_for_line = d3.select(label_text[0][i].parentNode),
                        y = d3.transform(label_for_line.attr("transform")).translate[1];
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
                .attr({
                    "class": "inner",
                    "transform": "translate(" + [-radius_pack, -radius_pack] + ")"
                });

        var bubble_inner = d3.layout.pack()
            .value(function(d) {
                return _(d.data).chain()
                    .filter(function(v) {
                        return v.toward === toward || toward === "both";
                    })
                    .pluck("spent")
                    .reduce(function(memo, num) {
                        return memo + num;
                    }, 0)
                    .value();
            })
            .sort(null)
            .size([2 * radius_pack, 2 * radius_pack])
            .padding(padding_pack);

        var drag = d3.behavior.drag()
            .origin(function(d) {
                return d;
            })
            .on("drag", function(d) {
                var relative_x = d3.event.x - radius_pack,
                    relative_y = radius_pack - d3.event.y,
                    new_r = Math.sqrt(Math.pow(relative_x, 2) + Math.pow(relative_y, 2));

                if(new_r >= radius_pack) {
                    return;
                }
                else {
                    d.x = d3.event.x;
                    d.y = d3.event.y;
                    d3.select(this).attr("transform", function(d) {
                        return "translate(" + [d.x, d.y] + ")";
                    });

                    //link.attr("d", function(dd) {
                    //    dd.node_x = relative_x;
                    //    dd.node_y = relative_y;

                    //    link_d_path(dd);
                    //});
                }
            });

        var node_inner_g = inner.selectAll("g.node_inner")
            .data(
                bubble_inner.nodes({ children: data.inner })
                    .filter(function(d) {
                        return !d.children;
                    })
            )
            .enter()
            .append("g")
                .attr({
                    "class": function(d) {
                        return "node_inner " + d.name;
                    },
                    "transform": function(d) {
                        return "translate(" + [d.x, d.y] + ")";
                    }
                });
            //.call(drag);

        var arc_inner = d3.svg.arc();

        var pie_inner = d3.layout.pie()
            .value(function(d) {
                return d.toward === toward || toward === "both" ? d.spent : 0;
            })
            .sort(null);

        var path_inner_g = node_inner_g.selectAll("g.arc_inner")
            .data(function(d) {
                return pie_inner(d.data).map(function(m) {
                    m.r = d.r;
                    return m;
                });
            })
            .enter()
            .append("g")
                .attr("class", "arc_inner")
                .on("mouseover", function(d) {
                    var who = d.data["committee.name"].match("^others (supporting|opposing) (trump|hillary)$") ? "Others" : d.data["committee.name"];

                    tooltip
                        .style("visibility", "visible")
                        .text(who + " spent $" + dollar_format(d.data.spent) + " " + d.data.toward + " " + d.data.candidate.capitalize());
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
                            return d.data.candidate === dd.name ? 1.0 : opacity_fade;
                        });
                })
                .on("mousemove", tooltip_position)
                .on("mouseout", mouseout_default);

        function link_data(data) {
            return pie_outer(data.outer).map(function(d) {
                var node = bubble_inner.nodes({ children: data.inner })
                    .filter(function(dd) {
                        return dd.name === d.data.candidate;
                    });

                d.node_x = node[0].x;
                d.node_y = node[0].y;
                d.node_r = node[0].r;

                var inner = pie_inner(_(data.inner).findWhere({"name": d.data.candidate}).data)
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
                path = d3_path.path();

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
                .attr({
                    "d": function(d) {
                        return link_d_path(d);
                    },
                    "class": "link"
                })
                .style("opacity", opacity_link)
                .attr("fill", function(d) {
                    return d.data.toward === "supporting" ? "#2ca02c" : "#d62728";
                })
                .on("mouseover", function(d) {
                    var who = d.data["committee.name"].match("^others (supporting|opposing) (trump|hillary)$") ? "Others" : d.data["committee.name"];

                    tooltip
                        .style("visibility", "visible")
                        .text(who + " spent $" + dollar_format(d.data.spent) + " " + d.data.toward + " " + d.data.candidate.capitalize());
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
                            return d.data.candidate === dd.name ? 1.0 : opacity_fade;
                        });
                })
                .on("mouseout", mouseout_default)
                .on("mousemove", tooltip_position)
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
                    return d.data.toward === "supporting" ? "#2ca02c" : "#d62728";
                })
                .each(function(d) {
                    this._current = d;
                });

        var image_clip = node_inner_g
            .append("defs")
            .append("clipPath")
                .attr("id", function(d) {
                    return "clip_" + d.name;
                })
            .append("circle")
                .attr({
                    "cx": 0,
                    "cy": 0,
                    "r": function(d) {
                        return d.r - thickness;
                    }
                });

        var image = node_inner_g
            .append("image")
                .attr({
                    "x": function(d) {
                        return thickness - d.r;
                    },
                    "y": function(d) {
                        return thickness - d.r;
                    },
                    "width": function(d) {
                        return 2 * (d.r - thickness);
                    },
                    "height": function(d) {
                        return 2 * (d.r - thickness);
                    },
                    "xlink:href": function(d) {
                        return "/images/" + d.name + "_head.jpg";
                    }
                })
                .style("clip-path", function(d) {
                    return "url(#clip_" + d.name + ")";
                })
                .on("mouseover", function(d) {
                    tooltip
                        .style("visibility", "visible")
                        .text("$" + dollar_format(d.value) + " went toward " + d.name.capitalize());
                    path_outer_g
                        .transition()
                        .style("opacity", function(dd) {
                            return d.name === dd.data.candidate ? 1.0 : opacity_fade;
                        });

                    link
                        .transition()
                        .style("opacity", function(dd) {
                            return d.name === dd.data.candidate ? opacity_link : opacity_fade;
                        });

                    path_inner_g
                        .transition()
                        .style("opacity", function(dd) {
                            return d.name === dd.data.candidate ? 1.0 : opacity_fade;
                        });

                    image
                        .transition()
                        .style("opacity", function(dd) {
                            return d.name === dd.name ? 1.0 : opacity_fade;
                        });
                })
                .on("mousemove", tooltip_position)
                .on("mouseout", mouseout_default);

        d3.selectAll("#toward_controls input")
            .on("change", function() {
                toward = this.value;

                path_outer.data(pie_outer(data.outer))
                    .transition()
                        .duration(transition_duration)
                        .attrTween("d", function(d) {
                            var i = d3.interpolate(this._current, d);
                            this._current = i(0);
                            return function(t) {
                                return arc_outer(i(t));
                            };
                        });

                label_outer
                    .attr("visibility", "visible")
                    .transition()
                        .duration(transition_duration)
                        .style("opacity", function(d) {
                            return d.data.toward === toward || toward === "both" ? 1.0 : 0.0;
                        })
                        .each("end", function() {
                            d3.select(this).attr("visibility", function(d) {
                                return d.data.toward === toward || toward === "both" ? "visible" : "hidden";
                            });
                        });

                label_circle.data(pie_outer(data.outer))
                    .transition()
                        .duration(transition_duration)
                        .attrTween("transform", function(d) {
                            var i = d3.interpolate(this._current, d);
                            this._current = i(0);
                            return function(t) {
                                return "translate(" + arc_outer.centroid(i(t)) + ")";
                            };
                        });

                label_line.data(pie_outer(data.outer))
                    .transition()
                        .duration(transition_duration)
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
                    .transition()
                        .duration(transition_duration)
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
                        .each(function() { ++n; })
                        .each("end", function() {
                            if(!--n) callback.apply(this, arguments);
                        });
                }

                label_text.data(pie_outer(data.outer))
                    .transition()
                        .duration(transition_duration)
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
                        .call(end_all, label_relax);

                node_inner_g
                    .data(
                        bubble_inner.nodes({ children: data.inner })
                            .filter(function(d) {
                                return !d.children;
                            })
                    )
                    .transition()
                        .duration(transition_duration)
                        .attr("transform", function(d) {
                            return "translate(" + [d.x, d.y] + ")"
                        });

                path_inner
                    .data(function(d) {
                        return pie_inner(d.data).map(function(m) {
                            m.r = d.r;
                            return m;
                        })
                    })
                    .transition()
                        .duration(transition_duration)
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
                    .transition()
                        .duration(transition_duration)
                        .attrTween("d", function(d) {
                            var i = d3.interpolate(this._current, d);
                            this._current = i(0);
                            return function(t) {
                                return link_d_path(i(t));
                            };
                        });

                image_clip
                    .transition()
                        .duration(transition_duration)
                        .attr("r", function(d) {
                            return d.r - thickness;
                        });

                image
                    .transition()
                        .duration(transition_duration)
                        .attr({
                            "x": function(d) {
                                return thickness - d.r;
                            },
                            "y": function(d) {
                                return thickness - d.r;
                            },
                            "width": function(d) {
                                return 2 * (d.r - thickness);
                            },
                            "height": function(d) {
                                return 2 * (d.r - thickness);
                            }
                        });
            });
    });
});

frappe.pages['student-movement'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'إدارة الطلاب والمجموعات',
        single_column: true
    });

    $(frappe.render_template("student_movement", {})).appendTo(page.body);

    // 1. تحميل المجموعات في القائمة المنسدلة
    frappe.call({
        method: "quran_app.quran_app.page.student_movement.student_movement.get_all_groups",
        callback: function(r) {
            if (r.message) {
                let select = $("#new-group-select");
                r.message.forEach(g => {
                    select.append(`<option value="${g.name}">${g.student_group_name} (${g.custom_group_code || g.name})</option>`);
                });
            }
        }
    });

    // 2. البحث اللايف (Live Search)
    let search_timer;
    function do_live_search() {
        let search_text = $("#search-student").val();
        let group_search = $("#search-group").val();
        
        let tbody = $("#available-students-list");
        let group_indicator = $("#group-indicator");
        
        tbody.html('<tr><td colspan="5" class="text-center">جاري البحث...</td></tr>');
        group_indicator.html('');
        
        $("#select-all-available").prop('checked', false);

        // 🌟 حل المشكلة: بنجمع أسماء الطلاب اللي موجودين في الجدول اليمين حالياً
        let selected_names = [];
        $("#selected-students-list tr[data-name]").each(function() {
            selected_names.push($(this).data("name"));
        });

        frappe.call({
            method: "quran_app.quran_app.page.student_movement.student_movement.search_students",
            args: {
                search_text: search_text,
                group_search: group_search
            },
            callback: function(r) {
                tbody.empty();
                if (r.message && r.message.students.length > 0) {
                    if (r.message.found_groups && r.message.found_groups.length > 0) {
                        group_indicator.html(`<span class="badge badge-info">المجموعة: ${r.message.found_groups.join(', ')}</span>`);
                    }

                    let has_new_students = false;

                    r.message.students.forEach(student => {
                        // 🌟 لو الطالب موجود بالفعل في الجدول اليمين، بنتخطاه (مش هنعرضه في الشمال)
                        if (selected_names.includes(student.name)) {
                            return; 
                        }

                        has_new_students = true;
                        let row = `
                            <tr data-name="${student.name}" data-code="${student.custom_student_code || ''}" data-group="${student.custom_student_group || ''}" data-status="${student.custom_status || ''}" style="cursor: pointer;">
                                <td><input type="checkbox" class="student-checkbox" data-name="${student.name}"></td>
                                <td>${student.custom_student_code || '-'}</td>
                                <td>${student.student_name}</td>
                                <td>${student.custom_student_group || '-'}</td>
                                <td>${student.custom_status || '-'}</td>
                            </tr>
                        `;
                        tbody.append(row);
                    });

                    // لو كل نتايج البحث موجودين أصلاً في اليمين
                    if (!has_new_students) {
                        tbody.html('<tr><td colspan="5" class="text-center text-muted">جميع النتائج مختارة بالفعل</td></tr>');
                    }

                } else {
                    tbody.html('<tr><td colspan="5" class="text-center text-muted">لا توجد نتائج مطابقة</td></tr>');
                }
            }
        });
    }

    // ربط البحث بالكتابة
    $("#search-student, #search-group").on("keyup", function() {
        clearTimeout(search_timer);
        search_timer = setTimeout(do_live_search, 500);
    });

    // 3. نقل الطالب
    $(document).on("change", ".student-checkbox", function(e) {
        let is_checked = $(this).is(":checked");
        let row = $(this).closest("tr");
        let studentName = row.data("name");
        
        if (is_checked) {
            // حماية إضافية: لو موجود أصلاً (مثلاً حصل لاج في الشبكة)
            if ($(`#selected-students-list tr[data-name="${studentName}"]`).length > 0) {
                row.hide();
                return;
            }

            let new_row = row.clone();
            new_row.find('td:first').html(`<button class="btn btn-danger btn-xs remove-btn">إزالة</button>`);
            new_row.find('.student-checkbox').remove();

            if ($("#selected-students-list tr td").length === 1 && $("#selected-students-list").text().includes("لم تقم")) {
                $("#selected-students-list").empty(); 
            }
            $("#selected-students-list").append(new_row);
            
            row.hide();
            update_selected_count();
        }
    });

    // 4. إزالة طالب واحد (من الجدول اليمين)
    $(document).on("click", ".remove-btn", function() {
        let selectedRow = $(this).closest("tr");
        let studentName = selectedRow.data("name");
        
        $(`#available-students-list tr[data-name="${studentName}"]`).show().find('input[type="checkbox"]').prop('checked', false);
        
        selectedRow.remove();
        update_selected_count();

        if ($("#selected-students-list tr").length === 0) {
            $("#selected-students-list").html('<tr><td colspan="5" class="text-center text-muted">لم تقم باختيار أي طلاب</td></tr>');
        }
    });

    // 5. تحديد الكل (Select All)
    $("#select-all-available").on("change", function() {
        let is_checked = $(this).is(":checked");
        
        $("#available-students-list .student-checkbox").each(function() {
            if ($(this).is(":checked") !== is_checked) {
                $(this).prop("checked", is_checked).trigger("change");
            }
        });

        $(this).prop("checked", false);
    });

    // 6. التحديد بضغطة على السطر كله
    $(document).on("click", "#available-students-list tr", function(e) {
        if ($(e.target).is('input[type="checkbox"]')) {
            return;
        }
        let checkbox = $(this).find(".student-checkbox");
        checkbox.prop("checked", !checkbox.prop("checked")).trigger("change");
    });

    // 7. إزالة الكل (زرار الإزالة الشامل)
    $(document).on("click", "#btn-remove-all", function() {
        $("#selected-students-list tr[data-name]").each(function() {
            let studentName = $(this).data("name");
            $(`#available-students-list tr[data-name="${studentName}"]`).show().find('input[type="checkbox"]').prop('checked', false);
        });

        $("#selected-students-list").html('<tr><td colspan="5" class="text-center text-muted">لم تقم باختيار أي طلاب</td></tr>');
        update_selected_count();
    });

    // دالة تحديث العداد
    function update_selected_count() {
        let count = $("#selected-students-list tr[data-name]").length;
        $(".card-title:contains('الطلاب المختارين')").text(`الطلاب المختارين (${count})`);
    }


	// 8. تنفيذ التغييرات (تغيير المجموعة أو الحالة)
    $("#btn-apply-changes").on("click", function() {
        let selected_students = [];
        $("#selected-students-list tr[data-name]").each(function() {
            selected_students.push($(this).data("name"));
        });

        let new_group = $("#new-group-select").val();
        let new_status = $("#new-status-select").val();

        // التحقق من وجود طلاب
        if (selected_students.length === 0) {
            frappe.msgprint("الرجاء اختيار طالب واحد على الأقل أولاً.");
            return;
        }

        // التحقق من وجود تغيير
        if (!new_group && !new_status) {
            frappe.msgprint("الرجاء تحديد مجموعة جديدة أو حالة جديدة لتنفيذها.");
            return;
        }

        // التحقق من منطق الحالة "موجود"
        if (new_status === "موجود" && !new_group) {
            // لو بيغيرهم لموجود ومفيش مجموعة مختارة، نتأكد إن كلهم عندهم مجموعات أصلاً
            let missing_group = false;
            $("#selected-students-list tr[data-name]").each(function() {
                if (!$(this).data("group")) {
                    missing_group = true;
                }
            });
            if (missing_group) {
                frappe.msgprint("يوجد طلاب ليس لديهم مجموعة. يجب تحديد مجموعة جديدة لتحويلهم إلى 'موجود'.");
                return;
            }
        }

        // تنفيذ الأمر
        frappe.call({
            method: "quran_app.quran_app.page.student_movement.student_movement.apply_changes",
            args: {
                students: selected_students,
                new_group: new_group,
                new_status: new_status
            },
            freeze: true,
            freeze_message: "جاري تنفيذ التغييرات...",
            callback: function(r) {
                if (r.message) {
                    frappe.show_alert({message: `تم تحديث ${r.message} طالب بنجاح`, indicator: 'green'});
                    
                    // تفريغ الشاشة بعد التنفيذ عشان نبدأ من جديد
                    $("#selected-students-list").html('<tr><td colspan="5" class="text-center text-muted">لم تقم باختيار أي طلاب</td></tr>');
                    $("#available-students-list").html('<tr><td colspan="5" class="text-center text-muted">قم بالبحث لعرض الطلاب</td></tr>');
                    update_selected_count();
                    $("#new-group-select").val("");
                    $("#new-status-select").val("");
                }
            }
        });
    });


	    // 9. إظهار وإخفاء خيار تحديث الفلوس بناءً على الحالة
    $("#new-status-select").on("change", function() {
        let status = $(this).val();
        if (status === "موجود") {
            $("#finance-checkbox-wrapper").slideDown();
        } else {
            $("#finance-checkbox-wrapper").slideUp();
            $("#chk-update-finance").prop("checked", true); // نرجعها true للافتراضي
        }
    });

    // تعديل زرار التنفيذ عشان يبعت الخيار الجديد (هتلاقي الزرار اللي اسمه btn-apply-changes وعدل جواه)
    $("#btn-apply-changes").off("click").on("click", function() {
        let selected_students = [];
        $("#selected-students-list tr[data-name]").each(function() {
            selected_students.push($(this).data("name"));
        });

        let new_group = $("#new-group-select").val();
        let new_status = $("#new-status-select").val();
        let update_finance = $("#chk-update-finance").is(":checked") ? 1 : 0; // 🌟 الخيار الجديد

        if (selected_students.length === 0) {
            frappe.msgprint("الرجاء اختيار طالب واحد على الأقل أولاً.");
            return;
        }
        if (!new_group && !new_status) {
            frappe.msgprint("الرجاء تحديد مجموعة جديدة أو حالة جديدة لتنفيذها.");
            return;
        }
        if (new_status === "موجود" && !new_group) {
            let missing_group = false;
            $("#selected-students-list tr[data-name]").each(function() {
                if (!$(this).data("group")) missing_group = true;
            });
            if (missing_group) {
                frappe.msgprint("يوجد طلاب ليس لديهم مجموعة. يجب تحديد مجموعة جديدة لتحويلهم إلى 'موجود'.");
                return;
            }
        }

        frappe.call({
            method: "quran_app.quran_app.page.student_movement.student_movement.apply_changes",
            args: {
                students: selected_students,
                new_group: new_group,
                new_status: new_status,
                update_finance: update_finance // 🌟 بعتنا الخيار
            },
            freeze: true,
            freeze_message: "جاري تنفيذ التغييرات...",
            callback: function(r) {
                if (r.message) {
                    frappe.show_alert({message: `تم تحديث ${r.message} طالب بنجاح`, indicator: 'green'});
                    $("#selected-students-list").html('<tr><td colspan="5" class="text-center text-muted">لم تقم باختيار أي طلاب</td></tr>');
                    $("#available-students-list").html('<tr><td colspan="5" class="text-center text-muted">قم بالبحث لعرض الطلاب</td></tr>');
                    update_selected_count();
                    $("#new-group-select").val("");
                    $("#new-status-select").val("");
                    $("#finance-checkbox-wrapper").slideUp();
                }
            }
        });
    });



};
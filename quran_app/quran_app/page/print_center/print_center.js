frappe.pages['print-center'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'مركز الطباعة',
        single_column: true
    });

    $(frappe.render_template("print_center", {})).appendTo(page.body);

	    $("#printTabs .nav-link").on("click", function(e) {
        e.preventDefault(); // منع أي سلوك افتراضي
        
        // 1. نشيل علامة active من كل التابات والصناديق
        $("#printTabs .nav-link").removeClass("active");
        $(".tab-pane").removeClass("active show");
        
        // 2. نضيف active للتاب اللي إحنا دوسنا عليه
        $(this).addClass("active");
        
        // 3. نعرض الصندوق اللي بيخص التاب ده
        let target = $(this).attr("href"); // بياخد الـ id (مثلاً #financial)
        $(target).addClass("active show");
    });

    // 1. تحميل الفروع في التاب المالي
    frappe.call({
        method: "quran_app.quran_app.page.print_center.print_center.get_branches",
        callback: function(r) {
            if (r.message) {
                let select = $("#filter-branch");
                r.message.forEach(b => {
                    select.append(`<option value="${b.name}">${b.name}</option>`);
                });
            }
        }
    });

    // 2. البحث عن المجموعات (Live)
    let search_timer;
    $("#search-group-input").on("keyup", function() {
        clearTimeout(search_timer);
        let search_text = $(this).val();
        
        search_timer = setTimeout(() => {
            if (!search_text) {
                $("#groups-list").html('<tr><td colspan="4" class="text-center text-muted">قم بالبحث لعرض المجموعات</td></tr>');
                return;
            }
            
            $("#groups-list").html('<tr><td colspan="4" class="text-center">جاري البحث...</td></tr>');
            
            frappe.call({
                method: "quran_app.quran_app.page.print_center.print_center.search_groups",
                args: { search_text: search_text },
                callback: function(r) {
                    let tbody = $("#groups-list").empty();
                    if (r.message && r.message.length > 0) {
                        r.message.forEach(g => {
                            let row = `
                                <tr>
                                    <td>${g.custom_group_code || '-'}</td>
                                    <td class="bold">${g.student_group_name}</td>
                                    <td>${g.custom_main_instructor || '-'}</td>
                                    <td>
                                        <button class="btn btn-xs btn-info btn-print" data-group="${g.name}" data-format="Attendance Sheet" data-orientation="Landscape">حضور</button>
                                        <button class="btn btn-xs btn-success btn-print" data-group="${g.name}" data-format="Quran Evaluation Sheet" data-orientation="Portrait">قرآن</button>
                                        <button class="btn btn-xs btn-warning btn-print" data-group="${g.name}" data-format="Manhaj Evaluation Sheet" data-orientation="Portrait">منهج</button>
                                    </td>
                                </tr>
                            `;
                            tbody.append(row);
                        });
                    } else {
                        tbody.html('<tr><td colspan="4" class="text-center text-muted">لا توجد نتائج</td></tr>');
                    }
                }
            });
        }, 500);
    });

    // 3. تشغيل الطباعة للمجموعات
    $(document).on("click", ".btn-print", function() {
        let group = $(this).data("group");
        let format = $(this).data("format");
        let orientation = $(this).data("orientation");
        frappe.utils.print("Student Group", group, format, "A4", orientation);
    });


    // 4. تشغيل طباعة الدفتر المالي (مباشرة بدون فتح التقرير)
    $("#btn-print-financial").on("click", function() {
        let branch = $("#filter-branch").val();
        let status = $("#filter-status").val();
        let group_type = $("#filter-group-type").val(); 
        
        let filters = {};
        if (branch) filters["custom_branch"] = branch;
        if (status) filters["custom_status"] = status;
        if (group_type) filters["group_type"] = group_type;
        
        frappe.dom.freeze('جاري تجهيز الطباعة...');
        
        frappe.call({
            method: "quran_app.quran_app.page.print_center.print_center.get_report_print_html",
            args: {
                report_name: "Financial Data Book",
                filters: filters,
                print_format: "Financial Data Book Print 1" // اسم الفورمات بتاعك
            },
            callback: function(r) {
                frappe.dom.unfreeze();
                if (r.message) {
                    // فتح نافذة جديدة وحقن الـ HTML
                    let print_window = window.open('', '_blank');
                    print_window.document.open();
                    print_window.document.write(r.message);
                    print_window.document.close();
                    
                    // استدعاء أمر الطباعة
                    setTimeout(function() {
                        print_window.print();
                    }, 1);
                } else {
                    // 🌟 التعديل هنا: لو مفيش بيانات أو حصل خطأ، نقفل النافذة الفاضية
                    frappe.msgprint({
                        title: 'تنبيه',
                        indicator: 'orange',
                        message: 'لا توجد بيانات للطباعة بناءً على الفلاتر المحددة. يرجى تغيير الفلاتر والمحاولة مرة أخرى.'
                    });
                }
            }
        });
    });
};
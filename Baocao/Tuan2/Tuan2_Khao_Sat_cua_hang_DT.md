# Khảo sát công việc tại cửa hàng điện thoại

*Công việc làm thủ công và công việc quản lý bằng phần mềm hoặc hệ thống riêng*

## Phạm vi

Tài liệu tổng hợp từ các case study có khảo sát hoặc phỏng vấn thực tế tại cửa hàng điện thoại. Phần mềm hoặc hệ thống riêng là hệ thống quản lý được xây dựng hoặc triển khai cho một cửa hàng hay doanh nghiệp cụ thể. Excel, sổ tay và các công cụ văn phòng chung không được tính là hệ thống quản lý của cửa hàng.

## Nguồn chính: Telesoon Phone Shop

## Nguồn bổ sung: Trucom

## Bảng 1. Công việc thủ công và công việc quản lý trên phần mềm hoặc hệ thống riêng

| **Nghiệp vụ**              | **Việc làm thủ công và hạn chế của cách cũ**                                                                           | **Việc đã đưa lên phần mềm hoặc hệ thống riêng**                                                                                   |
|----------------------------|------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| Nhập hàng                  | Thông tin hàng nhập, chứng từ và số lượng ghi trong hồ sơ, sổ sách. Việc kiểm tra và tổng hợp phụ thuộc vào nhân viên. | Hệ thống Telesoon quản lý việc mua hàng và đơn mua (purchase order), lưu thông tin sản phẩm và giao dịch mua.                      |
| Bán hàng                   | Giao dịch được ghi nhận và tính toán bằng tay trong hệ thống cũ, dễ sai sót khi tổng hợp.                              | IMS của Telesoon quản lý bán hàng và đơn bán (sales order), tính tiền và in hóa đơn. Trucom xử lý hoạt động bán hàng trên KiliMax. |
| Tồn kho                    | Kiểm kê thủ công tốn thời gian và nhân lực. Số liệu có thể sai do lỗi con người.                                       | IMS của Telesoon cập nhật và hiển thị tình trạng tồn kho. Trucom theo dõi tồn kho theo thời gian thực trên KiliMax.                |
| Đơn hàng                   | Đơn mua và đơn bán theo dõi trong quy trình cũ nên tra cứu bất tiện.                                                   | Telesoon đưa đơn bán và đơn mua vào IMS để lưu trữ và xử lý tập trung.                                                             |
| Báo cáo                    | Báo cáo tồn kho và nhu cầu mua hàng không lấy ngay được, phải tổng hợp dữ liệu.                                        | IMS Telesoon tạo báo cáo theo ngày, tuần, tháng, năm và báo cáo tổng hợp. Trucom có báo cáo hoạt động hằng ngày.                   |
| Giá và thay đổi giá        | Thay đổi giá và đối chiếu thông tin có thể phải xử lý bằng tay, nhất là khi giá đổi nhiều.                             | Trucom quản lý thay đổi giá và cập nhật sản phẩm tập trung trên KiliMax.                                                           |
| Mã sản phẩm và hóa đơn     | Nhập mã sản phẩm và số hóa đơn bằng tay làm tăng thao tác.                                                             | Telesoon yêu cầu hệ thống tự tạo số hóa đơn bán hàng và mã sản phẩm.                                                               |
| Khách hàng và nhà cung cấp | Thông tin lưu trong hồ sơ của quy trình cũ, khó tra cứu nhanh.                                                         | IMS Telesoon có dữ liệu chi tiết khách hàng và nhà cung cấp để quản lý trong hệ thống.                                             |

## Bảng 2. Bất cập khi công việc chưa đưa lên hệ thống quản lý

| **STT** | **Bất cập**                                                                      | **Hậu quả với cửa hàng**                                                           | **Cách xử lý trên phần mềm hoặc web**                                                           |
|---------|----------------------------------------------------------------------------------|------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| 1       | Kiểm kê tồn kho thủ công tốn nhiều thời gian và nhân lực.                        | Nhân viên mất thời gian đếm và đối chiếu, khó tập trung bán hàng và phục vụ khách. | Lưu số lượng tồn trong hệ thống, cập nhật tồn theo từng giao dịch và hỗ trợ kiểm kê, đối chiếu. |
| 2       | Dễ sai sót khi tính toán và ghi nhận dữ liệu.                                    | Số liệu tồn kho, doanh số hoặc giao dịch có thể không chính xác.                   | Hệ thống tự tính tiền, số lượng và tổng doanh thu, đồng thời kiểm tra dữ liệu đầu vào.          |
| 3       | Khó lấy ngay báo cáo tồn kho và nhu cầu nhập hàng.                               | Quản lý mất thời gian tổng hợp khi cần số liệu, quyết định nhập hàng bị chậm.      | Bảng điều khiển và báo cáo hiển thị tồn kho, hàng sắp hết, lịch sử nhập và bán.                 |
| 4       | Có thể không phát hiện kịp sản phẩm hết hàng, trong khi một số sản phẩm tồn lâu. | Mất cơ hội bán hàng, hoặc vốn bị giữ trong hàng tồn.                               | Đặt mức tồn tối thiểu, cảnh báo hàng sắp hết, báo cáo hàng tồn lâu.                             |
| 5       | Theo dõi giá thay đổi chưa tập trung.                                            | Nhân viên mất thời gian kiểm tra giá, khó kiểm soát các lần đổi giá.               | Quản lý giá tập trung, lưu lịch sử thay đổi giá, cập nhật giá bán trên hệ thống.                |
| 6       | Đơn hàng và giao dịch được quản lý riêng lẻ.                                     | Khó tra cứu lịch sử mua bán, dễ bỏ sót hoặc nhầm thông tin.                        | Quản lý bán hàng, đơn bán, mua hàng và đơn mua trong cùng một hệ thống.                         |
| 7       | Tổng hợp báo cáo cuối ngày, cuối tháng còn làm bằng tay.                         | Tốn thời gian, dễ sai lệch khi cộng và tổng hợp.                                   | Tự động tổng hợp doanh số, giao dịch, tồn kho và tạo báo cáo theo ngày, tuần, tháng, năm.       |

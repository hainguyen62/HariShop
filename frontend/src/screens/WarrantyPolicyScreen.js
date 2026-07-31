import React from 'react'
import { Link } from 'react-router-dom'

const sectionStyle = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14, padding: 24, marginBottom: 20,
}

const Section = ({ icon, title, children }) => (
  <div style={sectionStyle}>
    <h5 style={{ color: '#33FFCC', fontWeight: 700, marginBottom: 14 }}>
      <i className={`${icon} me-2`}></i>{title}
    </h5>
    <div style={{ color: '#d0d3dd', fontSize: 14, lineHeight: 1.8 }}>
      {children}
    </div>
  </div>
)

const WarrantyPolicyScreen = () => {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h2 style={{ color: '#ffffff', fontWeight: 700, marginBottom: 8 }}>
        <i className='fas fa-shield-alt me-2' style={{ color: '#33FFCC' }}></i>
        Chính sách bảo hành
      </h2>
      <p style={{ color: '#8a8fa3', fontSize: 14, marginBottom: 24 }}>
        Áp dụng cho tất cả sản phẩm điện thoại chính hãng được bán tại HariShop.
      </p>

      <Section icon='fas fa-users' title='1. Đối tượng áp dụng'>
        <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
          <li>Áp dụng cho khách hàng mua sản phẩm trực tiếp tại HariShop, có đơn hàng hợp lệ trong hệ thống.</li>
          <li>Thời hạn bảo hành được tính riêng cho từng sản phẩm (xem cụ thể tại trang chi tiết sản phẩm hoặc mục "Tra cứu bảo hành"), thường từ 12 đến 24 tháng tùy dòng máy.</li>
        </ul>
      </Section>

      <Section icon='fas fa-calendar-check' title='2. Thời điểm bắt đầu tính bảo hành'>
        <p>
          Thời hạn bảo hành được tính từ <strong>ngày giao hàng thành công</strong> (không phải ngày đặt hàng hay ngày thanh toán), theo đúng ngày ghi nhận trên hệ thống khi đơn vị vận chuyển xác nhận giao hàng.
        </p>
        <p style={{ marginBottom: 0 }}>
          Bạn có thể tự tra cứu ngày hết hạn bảo hành bất kỳ lúc nào tại trang{' '}
          <Link to='/bao-hanh' style={{ color: '#33FFCC' }}>Tra cứu bảo hành</Link>, chỉ cần nhập mã đơn hàng và số điện thoại đã đặt.
        </p>
      </Section>

      <Section icon='fas fa-check-circle' title='3. Phạm vi được bảo hành'>
        <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
          <li>Lỗi phần cứng do nhà sản xuất trong quá trình sử dụng bình thường (lỗi màn hình, pin chai bất thường sớm, lỗi mainboard, lỗi camera, cổng sạc...).</li>
          <li>Lỗi phần mềm gốc của máy (không phải do cài đặt phần mềm bên thứ ba hoặc can thiệp hệ điều hành).</li>
          <li>Máy không lên nguồn, tự khởi động lại, treo logo không do rơi vỡ/vào nước.</li>
        </ul>
      </Section>

      <Section icon='fas fa-times-circle' title='4. Trường hợp KHÔNG được bảo hành'>
        <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
          <li>Sản phẩm đã hết thời hạn bảo hành theo tra cứu trên hệ thống.</li>
          <li>Hư hỏng do rơi vỡ, va đập, cong vênh, vào nước/ẩm (trừ dòng máy có chuẩn kháng nước và hư hỏng đúng theo điều kiện chuẩn đó).</li>
          <li>Màn hình bị nứt, vỡ, hở sáng do tác động ngoại lực.</li>
          <li>Máy đã bị tháo mở, sửa chữa, thay linh kiện tại nơi không phải HariShop hoặc trung tâm bảo hành ủy quyền.</li>
          <li>Tem, seal bảo hành (nếu có) bị rách, mất, hoặc có dấu hiệu chỉnh sửa.</li>
          <li>Số IMEI/serial trên máy không khớp với thông tin trong đơn hàng.</li>
          <li>Hư hỏng do thiên tai, hỏa hoạn, hoặc các nguyên nhân bất khả kháng khác.</li>
          <li>Hao mòn tự nhiên theo thời gian sử dụng (trầy xước ngoại quan, pin chai do sử dụng lâu ngày trong giới hạn thông thường của nhà sản xuất).</li>
        </ul>
      </Section>

      <Section icon='fas fa-list-ol' title='5. Quy trình yêu cầu bảo hành'>
        <ol style={{ paddingLeft: 20, marginBottom: 0 }}>
          <li>Tra cứu tình trạng bảo hành tại trang <Link to='/bao-hanh' style={{ color: '#33FFCC' }}>Tra cứu bảo hành</Link> để xác nhận sản phẩm còn trong thời hạn.</li>
          <li>Liên hệ HariShop qua hotline/email hỗ trợ (xem mục Liên hệ ở cuối trang), cung cấp mã đơn hàng và mô tả lỗi gặp phải.</li>
          <li>Mang máy đến điểm tiếp nhận bảo hành của HariShop (hoặc gửi theo hướng dẫn nếu ở xa), kèm hóa đơn/mã đơn hàng.</li>
          <li>Nhân viên kỹ thuật kiểm tra, xác định lỗi có thuộc phạm vi bảo hành hay không trong vòng 1–3 ngày làm việc.</li>
          <li>Nếu đủ điều kiện: sửa chữa/thay thế linh kiện miễn phí, hoặc đổi máy mới cùng loại nếu lỗi không thể khắc phục (tùy chính sách nhà sản xuất từng dòng máy).</li>
          <li>Nếu không đủ điều kiện bảo hành miễn phí: HariShop báo giá sửa chữa trước, khách hàng xác nhận mới tiến hành.</li>
        </ol>
      </Section>

      <Section icon='fas fa-circle-question' title='6. Câu hỏi thường gặp'>
        <p><strong>Mất hóa đơn/không nhớ mã đơn hàng thì có được bảo hành không?</strong><br />
        Có — hệ thống lưu lại đơn hàng theo số điện thoại đặt hàng, chỉ cần cung cấp đúng số điện thoại và thông tin sản phẩm để đối chiếu.</p>
        <p><strong>Mua hộ người khác, số điện thoại trên đơn không phải của người dùng máy thì sao?</strong><br />
        Vẫn tra cứu được bình thường — hệ thống xác minh theo số điện thoại đã dùng lúc đặt hàng, không yêu cầu người mang máy đi bảo hành phải là người đứng tên đơn.</p>
        <p style={{ marginBottom: 0 }}><strong>Bảo hành có mất phí không?</strong><br />
        Miễn phí hoàn toàn nếu lỗi thuộc phạm vi bảo hành (mục 3). Các trường hợp ngoài phạm vi (mục 4) sẽ được báo giá sửa chữa trước khi thực hiện, khách hàng có quyền từ chối nếu không đồng ý.</p>
      </Section>

      <p style={{ color: '#8a8fa3', fontSize: 13, textAlign: 'center' }}>
        Chính sách có thể được cập nhật theo từng thời kỳ. Mọi thắc mắc vui lòng liên hệ đội ngũ hỗ trợ của HariShop.
      </p>
    </div>
  )
}

export default WarrantyPolicyScreen
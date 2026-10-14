# SecurePharma

SecurePharma quản lý danh mục thuốc, nguồn nhập, các lô tồn kho và hoạt động bán hàng của nhà thuốc.

## Language

**Thuốc**:
Mặt hàng dược được nhận diện bởi tên, hoạt chất, quy cách, giá bán tham khảo và danh mục.
_Avoid_: Sản phẩm kho, lô thuốc

**Lô thuốc**:
Một lượng thuốc cụ thể phát sinh từ một phiếu nhập, có ngày sản xuất, hạn sử dụng, giá nhập và số lượng tồn riêng.
_Avoid_: Thuốc, mặt hàng

**Tồn khả dụng**:
Tổng số lượng còn lại của các lô chưa hết hạn thuộc phiếu nhập đã nhập; đây là giá trị dẫn xuất, không chỉnh sửa trực tiếp trên thuốc.
_Avoid_: Số lượng thuốc, tồn tổng có thể sửa

**Điều chỉnh tồn**:
Bản ghi kiểm kê làm thay đổi số lượng còn lại của một lô cụ thể, luôn lưu số lượng trước, số lượng sau, lý do và người thực hiện.
_Avoid_: Sửa tồn, cập nhật số lượng thuốc

**Nhập thêm hàng**:
Tạo phiếu nhập và lô thuốc mới để ghi nhận hàng mua từ nhà cung cấp.
_Avoid_: Cộng tồn trực tiếp, điều chỉnh tăng

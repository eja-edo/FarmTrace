# Contribution Guidelines

## Cách đóng góp

Chúng tôi hoan nghênh mọi đóng góp cho dự án! Dưới đây là hướng dẫn để bạn có thể đóng góp hiệu quả.

## Quy trình đóng góp

### 1. Fork Repository

- Fork repository về GitHub account của bạn
- Clone repository đã fork về máy local

```bash
git clone https://github.com/<your-username>/blockchainCore.git
cd blockchainCore
```

### 2. Tạo Branch mới

```bash
git checkout -b feature/your-feature-name
# hoặc
git checkout -b bugfix/issue-number
```

### 3. Thực hiện thay đổi

- Viết code theo coding standards
- Thêm tests cho các tính năng mới
- Cập nhật documentation nếu cần

### 4. Commit changes

```bash
git add .
git commit -m "feat: add new feature description"
```

**Commit message format**:
- `feat`: Tính năng mới
- `fix`: Sửa lỗi
- `docs`: Thay đổi documentation
- `style`: Formatting, missing semi colons, etc
- `refactor`: Refactoring code
- `test`: Thêm tests
- `chore`: Cập nhật build tasks, package manager, etc

### 5. Push và tạo Pull Request

```bash
git push origin feature/your-feature-name
```

Tạo Pull Request trên GitHub với:
- Mô tả rõ ràng về thay đổi
- Link đến issue liên quan (nếu có)
- Screenshots (nếu thay đổi UI)

## Coding Standards

### Go (Chaincode)

```go
// Sử dụng gofmt
gofmt -w .

// Chạy golint
golint ./...

// Chạy go vet
go vet ./...
```

**Best practices**:
- Tên hàm, biến rõ ràng và có ý nghĩa
- Thêm comments cho exported functions
- Handle errors properly
- Write unit tests

### JavaScript/Node.js (API)

```javascript
// Sử dụng ESLint
npm run lint

// Format code
npm run format
```

**Best practices**:
- Sử dụng async/await thay vì callbacks
- Handle errors với try-catch
- Validate input
- Write descriptive variable names
- Add JSDoc comments

### Documentation

- Sử dụng Markdown
- Rõ ràng, súc tích
- Ví dụ code khi cần thiết
- Cập nhật README khi thêm tính năng mới

## Testing

### Chaincode Tests

```bash
cd chaincode/go
go test -v ./...
```

### API Tests

```bash
cd apps/gateway-nodejs
npm test
```

### Integration Tests

```bash
cd network/scripts
.\smokeTest.ps1
```

## Pull Request Guidelines

### Checklist trước khi submit PR:

- [ ] Code đã được test kỹ lưỡng
- [ ] Tất cả tests đều pass
- [ ] Code tuân theo coding standards
- [ ] Documentation đã được cập nhật
- [ ] Commit messages rõ ràng và có ý nghĩa
- [ ] Không có conflicts với main branch
- [ ] PR description đầy đủ thông tin

### PR Review Process

1. Maintainer sẽ review code
2. Có thể yêu cầu thay đổi
3. Sau khi approve, PR sẽ được merge
4. CI/CD sẽ tự động deploy (nếu cấu hình)

## Báo cáo lỗi

### Tạo Issue với thông tin:

- **Mô tả lỗi**: Mô tả chi tiết vấn đề
- **Các bước tái hiện**: Cách tái hiện lỗi
- **Kết quả mong đợi**: Điều bạn mong đợi xảy ra
- **Kết quả thực tế**: Điều thực sự xảy ra
- **Môi trường**: OS, version, etc
- **Logs**: Attach relevant logs
- **Screenshots**: Nếu có

### Template:

```markdown
**Mô tả lỗi**
[Mô tả ngắn gọn về lỗi]

**Các bước tái hiện**
1. Bước 1
2. Bước 2
3. ...

**Kết quả mong đợi**
[Mô tả kết quả mong đợi]

**Kết quả thực tế**
[Mô tả kết quả thực tế]

**Môi trường**
- OS: Windows 11
- Docker: 20.10.x
- Node.js: 16.x
- Fabric: 2.5.x

**Logs**
```
[Paste logs here]
```

**Screenshots**
[Attach screenshots]
```

## Đề xuất tính năng mới

### Tạo Issue với:

- **Tính năng**: Mô tả tính năng
- **Lý do**: Tại sao cần tính năng này
- **Giải pháp đề xuất**: Cách implement (nếu có)
- **Alternatives**: Các giải pháp khác đã xem xét
- **Additional context**: Thông tin thêm

## Code Review Guidelines

### Khi review code, kiểm tra:

#### Functionality
- Code có hoạt động đúng không?
- Edge cases đã được handle chưa?
- Error handling đúng chưa?

#### Code Quality
- Code dễ đọc và maintain không?
- Có code duplications không?
- Naming conventions đúng chưa?

#### Performance
- Có performance issues không?
- Database queries có optimize không?
- Memory leaks?

#### Security
- Input validation
- SQL injection prevention
- Sensitive data handling

#### Tests
- Có đủ test coverage không?
- Tests có ý nghĩa không?
- Edge cases được test chưa?

## Community Guidelines

### Be Respectful
- Tôn trọng ý kiến của người khác
- Constructive feedback
- No harassment or trolling

### Be Collaborative
- Giúp đỡ người mới
- Share knowledge
- Review code của người khác

### Be Professional
- Keep discussions focused
- No spam or off-topic
- Follow code of conduct

## Questions?

Nếu có câu hỏi:
- Mở Discussion trên GitHub
- Tham gia Slack channel (nếu có)
- Email: [support email]

## License

Bằng cách đóng góp, bạn đồng ý rằng contributions của bạn sẽ được licensed under MIT License.

---

**Cảm ơn bạn đã đóng góp! 🙏**

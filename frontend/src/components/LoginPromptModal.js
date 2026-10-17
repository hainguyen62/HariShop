import React from 'react'
import { Modal, Button } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { closeLoginPrompt } from '../actions/loginPromptActions'

const panel = { background: '#1a1a2e', color: '#eef0f7', borderColor: 'rgba(51,255,204,0.2)' }

// Popup mời đăng nhập khi khách chưa đăng nhập bấm thêm vào giỏ hàng
const LoginPromptModal = () => {
  const dispatch = useDispatch()
  const history = useHistory()
  const { open, redirect } = useSelector((state) => state.loginPrompt)

  const close = () => dispatch(closeLoginPrompt())
  const goLogin = () => {
    close()
    history.push(`/login?redirect=${redirect || '/'}`)
  }

  return (
    <Modal show={open} onHide={close} centered dialogClassName='login-prompt-modal'>
      {/* Màu đặt rõ để không trùng nền theo giao diện sáng hoặc tối */}
      <style>{'.login-prompt-modal .modal-content { background: #1a1a2e; border: 1px solid rgba(51,255,204,0.25); } .login-prompt-modal .close { color: #eef0f7; text-shadow: none; opacity: 0.8; }'}</style>
      <Modal.Header closeButton style={panel}>
        <Modal.Title style={{ color: '#ffffff', fontSize: 18 }}>Bạn cần đăng nhập</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ ...panel, color: '#d6d9e6', fontSize: 15 }}>
        Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.
      </Modal.Body>
      <Modal.Footer style={panel}>
        <Button variant='outline-light' onClick={close}>Để sau</Button>
        <Button
          onClick={goLogin}
          style={{ background: '#33FFCC', color: '#0f0f23', border: 'none', fontWeight: 700 }}
        >
          Đi đến trang đăng nhập
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default LoginPromptModal

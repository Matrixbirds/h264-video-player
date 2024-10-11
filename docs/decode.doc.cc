void VosGateway::sendVideoFrame(uint8_t* payload_data,
                                uint16_t payload_size,
                                uint32_t from_uid,
                                uint16_t num_packets) {
// 1500 IP_PACKET_SIZE
// 255 NUM_PACKETS
// start_code  
  webrtc::RTPHeader header;
  if (!rtp_header_parser_->Parse((const unsigned char*)payload_data, payload_size, &header)) {
    LOG(ERROR, "h.264 stream parse rtp header failed");
    return;
  }
  // LOG(DEBUG, "maojie-debug: seq %u ts %u", header.sequenceNumber, header.timestamp);
  uint16_t payload_length = payload_size - header.headerLength;
  uint16_t payload_data_length = payload_length - header.paddingLength;
  const uint8_t* payload = (const unsigned char*)payload_data + header.headerLength;
  uint8_t nal_type = payload[0] & 0x1F;
  if (nal_type == 6) return;
  if (nal_type == 0x1c) {  // FU-A Nalu
    uint8_t flag = payload[1] & 0xe0;
    uint8_t nal_fua = (payload[0] & 0xe0) | (payload[1] & 0x1F);
    // LOG(DEBUG, "========maojie: FU-A Nalu: nal_tupe %u flag %u", nal_type, flag);
    if (flag == 0x80) {  // Start bit
      data_ = new uint8_t[MAX_PACKET_SIZE * num_packets];
      memset(data_, 0, sizeof(MAX_PACKET_SIZE * num_packets));
      offset_ = 0;
      webrtc::ByteWriter<uint32_t>::WriteBigEndian(data_, from_uid);
      data_[4] = 0x01;
      data_[5] = 0x01;
      data_[6] = 0;
      data_[7] = 0;
      data_[8] = 0;
      data_[9] = 1;
      memcpy(&data_[10], &payload_data[header.headerLength + 1], payload_data_length - 1);
      data_[10] = nal_fua;
      offset_ += payload_data_length + 10 - 1;
      // LOG(DEBUG, "maojie-debug: FU-A start bit: offset %u num_packets %u", offset_, num_packets);
    } else if (flag == 0x40) {  // End bit
      if (data_ == nullptr) {
        // LOG(DEBUG, "!!!!!!!!======================maojie-debug: data_ is not been initialized");
        return;
      }
      memcpy(&data_[offset_], &payload_data[header.headerLength + 2], payload_data_length - 2);
      offset_ += payload_data_length - 2;
      // LOG(DEBUG, "maojie-debug-emit: FU-A end bit: offset %u now_ms %llu nalu_seq %u elapse %u size %u",
      //    offset_, now_ms(), nalu_sent_++, last_nalu_sent_ts_ ? now_ms() - last_nalu_sent_ts_ : 0, offset_);
      last_nalu_sent_ts_ = now_ms();
      ctx_.event_dispatcher.emit(VIDEO_STREAM, std::string((char*)data_, offset_), PEER_NONE);
      delete[] data_;
      data_ = nullptr;
    } else {  // Middle
      if (data_ == nullptr) {
        // LOG(DEBUG, "!!!!!!!!======================maojie-debug: data_ is not been initialized");
        return;
      }
      memcpy(&data_[offset_], &payload_data[header.headerLength + 2], payload_data_length - 2);
      offset_ += payload_data_length - 2;
      // LOG(DEBUG, "maojie-debug: FU-A middle bit: offset_ %u", offset_);
    }
  } else {  // Single Nalu or StapA Nalu
    // LOG(DEBUG, "maojie-debug: Single or StapA: nal_type %u", nal_type);
    if (nal_type == 0x18) {  // StapA Nalu
      const uint8_t* nalu_ptr = (const uint8_t*)payload_data + header.headerLength + 1;
      size_t nalu_length = payload_data_length - 1;
      while (nalu_length > 0) {
        if (nalu_length < sizeof(uint16_t)) {
          break;
        }
        uint16_t nalu_size = webrtc::ByteReader<uint16_t>::ReadBigEndian(nalu_ptr);
        nalu_ptr += sizeof(uint16_t);
        nalu_length -= sizeof(uint16_t);
        if (nalu_size > nalu_length) {
          break;
        }
        uint8_t start_code[IP_PACKET_SIZE];
        webrtc::ByteWriter<uint32_t>::WriteBigEndian(start_code, from_uid);
        start_code[4] = 0x01;
        start_code[5] = 0x01;
        start_code[6] = 0;
        start_code[7] = 0;
        start_code[8] = 0;
        start_code[9] = 1;
        memcpy(&start_code[10], nalu_ptr, nalu_size);
        // LOG(DEBUG, "maojie-debug-emit: StapA: nalu_size %u nalu_type %u now_ms %llu nalu_seq %u elapse %u size %u",
        //    nalu_size, start_code[4] & 0x1F, now_ms(), nalu_sent_++, last_nalu_sent_ts_ ? now_ms() - last_nalu_sent_ts_ : 0, nalu_size + 4);
        last_nalu_sent_ts_ = now_ms();
        ctx_.event_dispatcher.emit(VIDEO_STREAM,
                                   std::string((char*)start_code, nalu_size + 10),
                                   PEER_NONE);
        nalu_ptr += nalu_size;
        nalu_length -= nalu_size;
      }
    } else {  // Single Nalu
      // nalu start code
      uint8_t start_code[IP_PACKET_SIZE];
      webrtc::ByteWriter<uint32_t>::WriteBigEndian(start_code, from_uid);
      start_code[4] = 0x01;
      start_code[5] = 0x01;
      start_code[6] = 0;
      start_code[7] = 0;
      start_code[8] = 0;
      start_code[9] = 1;
      //LOG(DEBUG, "maojie-debug-emit: Single Nalu: nal_type %u now_ms %llu nalu_seq %u elapse %u size %u",
      //    nal_type, now_ms(), nalu_sent_++, last_nalu_sent_ts_ ? now_ms() - last_nalu_sent_ts_ : 0, payload_data_length + 4);
      last_nalu_sent_ts_ = now_ms();
      memcpy(&start_code[10], &payload_data[header.headerLength], payload_data_length);
      ctx_.event_dispatcher.emit(VIDEO_STREAM,
                                 std::string((char*)start_code, payload_data_length + 10),
                                 PEER_NONE);
    }
  }
}